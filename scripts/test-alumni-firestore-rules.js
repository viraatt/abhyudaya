import assert from "node:assert/strict";
import { deleteApp, initializeApp as initializeClientApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

const projectId = process.env.GCLOUD_PROJECT || "demo-abhyudaya";
const clientApp = initializeClientApp({ apiKey: "emulator-test", projectId }, "alumni-rules-test");
const auth = getAuth(clientApp);
const db = getFirestore(clientApp);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const adminApp = initializeAdminApp({ projectId }, "alumni-rules-admin");
const adminDb = getAdminFirestore(adminApp);
const submissions = collection(db, "alumniSubmissions");
const blogCollection = collection(db, "blogs");

async function createAccount(email, role) {
  const credential = await createUserWithEmailAndPassword(auth, email, "test-password-123");
  await adminDb.doc(`users/${credential.user.uid}`).set({ role });
  return { uid: credential.user.uid, email, role };
}

async function login(user) {
  await signInWithEmailAndPassword(auth, user.email, "test-password-123");
}

async function expectPermissionDenied(label, action) {
  try {
    await action();
  } catch (error) {
    assert.equal(error.code, "permission-denied", `${label}: expected permission-denied, got ${error.code}`);
    console.log(`PASS denied: ${label}`);
    return;
  }
  assert.fail(`${label}: operation unexpectedly succeeded`);
}

async function createSubmission(user, title, status = "draft") {
  const data = {
    title,
    slug: title.toLowerCase().replaceAll(" ", "-"),
    category: "Alumni Stories",
    excerpt: "Test excerpt",
    content: "Test article body",
    featuredImage: "",
    tags: [],
    author: { name: user.email.split("@")[0] },
    authorUid: user.uid,
    authorId: user.uid,
    isAlumniContribution: true,
    status,
    publishedBlogId: null,
    linkedBlogId: null,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(submissions, data);
  return { id: ref.id, ...data };
}

async function publishAsSuperAdmin(submissionId, blogId) {
  const submissionRef = doc(db, "alumniSubmissions", submissionId);
  const batch = writeBatch(db);
  batch.set(doc(blogCollection, blogId), {
    title: "Approved article",
    slug: `approved-${blogId}`,
    category: "Alumni Stories",
    excerpt: "Test excerpt",
    content: "Test article body",
    featuredImage: "",
    status: "Published",
    author: "Test Alumni",
    isAlumniContribution: true,
    submissionId,
  });
  batch.update(submissionRef, {
    status: "published",
    publishedBlogId: blogId,
    linkedBlogId: blogId,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

async function setPublicationStatus(submissionId, blogId, submitStatus, blogStatus, resolvedBlogId = undefined) {
  const batch = writeBatch(db);
  const submissionUpdate = {
    status: submitStatus,
    updatedAt: serverTimestamp(),
  };
  if (resolvedBlogId !== undefined) submissionUpdate.publishedBlogId = resolvedBlogId;
  batch.update(doc(db, "alumniSubmissions", submissionId), submissionUpdate);
  batch.update(doc(db, "blogs", blogId), {
    status: blogStatus,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

try {
  const authorA = await createAccount("alumni-a@example.test", "alumni");
  const authorB = await createAccount("alumni-b@example.test", "alumni");
  const superAdmin = await createAccount("super-admin@example.test", "super_admin");

  // A. Alumni A creates a draft. B. The exact authorUid query returns only A's article.
  await login(authorA);
  const articleA = await createSubmission(authorA, "Article A");
  let ownQuery = await getDocs(query(submissions, where("authorUid", "==", authorA.uid)));
  assert.deepEqual(ownQuery.docs.map((item) => item.id), [articleA.id]);
  assert.ok((await getDoc(doc(db, "alumniSubmissions", articleA.id))).exists());
  console.log("PASS alumni authorUid query and own read");

  // C. The author can edit their own draft.
  await updateDoc(doc(db, "alumniSubmissions", articleA.id), { title: "Article A edited" });
  assert.equal((await getDoc(doc(db, "alumniSubmissions", articleA.id))).data().title, "Article A edited");
  console.log("PASS owner edit");

  await updateDoc(doc(db, "alumniSubmissions", articleA.id), { status: "pending" });
  console.log("PASS owner submits draft for approval");

  await login(authorB);
  const articleB = await createSubmission(authorB, "Article B", "pending");
  await login(authorA);
  ownQuery = await getDocs(query(submissions, where("authorUid", "==", authorA.uid)));
  assert.deepEqual(ownQuery.docs.map((item) => item.id), [articleA.id]);
  await expectPermissionDenied("Alumni A reads Alumni B submission", () => getDoc(doc(db, "alumniSubmissions", articleB.id)));
  await expectPermissionDenied("Alumni A edits Alumni B submission", () => updateDoc(doc(db, "alumniSubmissions", articleB.id), { title: "tamper" }));
  await expectPermissionDenied("Alumni A rejects Alumni B submission", () => updateDoc(doc(db, "alumniSubmissions", articleB.id), { status: "rejected" }));
  await expectPermissionDenied("Alumni A approves Alumni B submission", () => updateDoc(doc(db, "alumniSubmissions", articleB.id), { status: "approved" }));
  await expectPermissionDenied("Alumni A publishes Alumni B submission", () => updateDoc(doc(db, "alumniSubmissions", articleB.id), { status: "published" }));
  await expectPermissionDenied("Alumni A deletes Alumni B submission", () => deleteDoc(doc(db, "alumniSubmissions", articleB.id)));

  // D. Alumni cannot publish their own draft; only Super Admin can approve/publish.
  await expectPermissionDenied("Alumni self-publishes own article", () => updateDoc(doc(db, "alumniSubmissions", articleA.id), { status: "published" }));
  await login(superAdmin);
  const blogAId = `blog-${articleA.id}`;
  await publishAsSuperAdmin(articleA.id, blogAId); // Missing/empty featured image is allowed.
  assert.equal((await getDoc(doc(db, "blogs", blogAId))).data().status, "Published");
  assert.equal((await getDoc(doc(db, "alumniSubmissions", articleA.id))).data().status, "published");
  assert.equal((await getDoc(doc(db, "alumniSubmissions", articleA.id))).data().linkedBlogId, blogAId);
  console.log("PASS Super Admin approval and publish without featured image");

  // G. Super Admin can edit the linked published blog and submission.
  await updateDoc(doc(db, "blogs", blogAId), { title: "Admin edited title" });
  await updateDoc(doc(db, "alumniSubmissions", articleA.id), { title: "Admin edited title" });
  assert.equal((await getDoc(doc(db, "alumniSubmissions", articleA.id))).data().title, "Admin edited title");
  console.log("PASS Super Admin edit");

  // K/L. Another contributor cannot access, edit, delete, unpublish, or publish A's article.
  await login(authorB);
  await expectPermissionDenied("Alumni B reads Alumni A published submission", () => getDoc(doc(db, "alumniSubmissions", articleA.id)));
  await expectPermissionDenied("Alumni B unpublishes Alumni A blog", () => setPublicationStatus(articleA.id, blogAId, "approved", "Draft"));
  const crossDelete = writeBatch(db);
  crossDelete.delete(doc(db, "blogs", blogAId));
  crossDelete.delete(doc(db, "alumniSubmissions", articleA.id));
  await expectPermissionDenied("Alumni B deletes Alumni A linked records", () => crossDelete.commit());

  // E. The owning author can edit and unpublish their published article.
  await login(authorA);
  await updateDoc(doc(db, "alumniSubmissions", articleA.id), { title: "Author edited published title" });
  await updateDoc(doc(db, "blogs", blogAId), { title: "Author edited published title" });
  await setPublicationStatus(articleA.id, blogAId, "approved", "Draft");
  assert.equal((await getDoc(doc(db, "alumniSubmissions", articleA.id))).data().status, "approved");
  assert.equal((await getDoc(doc(db, "blogs", blogAId))).data().status, "Draft");
  console.log("PASS owner published edit and atomic unpublish");

  // F. The owner can delete both linked records atomically after unpublishing.
  const ownerDelete = writeBatch(db);
  ownerDelete.delete(doc(db, "blogs", blogAId));
  ownerDelete.delete(doc(db, "alumniSubmissions", articleA.id));
  await ownerDelete.commit();
  assert.equal((await adminDb.doc(`alumniSubmissions/${articleA.id}`).get()).exists, false);
  assert.equal((await adminDb.doc(`blogs/${blogAId}`).get()).exists, false);
  console.log("PASS owner linked delete");

  // H/I/J. Super Admin can publish, unpublish, republish, and delete another linked article.
  await login(superAdmin);
  const blogBId = `blog-${articleB.id}`;
  await publishAsSuperAdmin(articleB.id, blogBId);
  await updateDoc(doc(db, "alumniSubmissions", articleB.id), { publishedBlogId: null });
  await login(authorB);
  const resolvedBlogQuery = await getDocs(query(
    blogCollection,
    where("status", "==", "Published"),
    where("submissionId", "==", articleB.id),
  ));
  assert.deepEqual(resolvedBlogQuery.docs.map((item) => item.id), [blogBId]);
  console.log("PASS owner resolves published blog through reciprocal submissionId");
  await setPublicationStatus(articleB.id, blogBId, "approved", "Draft", blogBId);
  assert.equal((await getDoc(doc(db, "alumniSubmissions", articleB.id))).data().publishedBlogId, blogBId);
  assert.equal((await getDoc(doc(db, "blogs", blogBId))).data().status, "Draft");
  console.log("PASS owner resolves linked blog by submissionId and repairs missing publishedBlogId during unpublish");
  await login(superAdmin);
  await setPublicationStatus(articleB.id, blogBId, "published", "Published");
  const adminDelete = writeBatch(db);
  adminDelete.delete(doc(db, "blogs", blogBId));
  adminDelete.delete(doc(db, "alumniSubmissions", articleB.id));
  await adminDelete.commit();
  assert.equal((await adminDb.doc(`alumniSubmissions/${articleB.id}`).get()).exists, false);
  assert.equal((await adminDb.doc(`blogs/${blogBId}`).get()).exists, false);
  console.log("PASS Super Admin publish, unpublish, republish, and linked delete");

  // A published submission with a stale/missing blog reference can still be deleted safely.
  await login(authorA);
  const orphanArticle = await createSubmission(authorA, "Orphaned published article", "pending");
  await login(superAdmin);
  await updateDoc(doc(db, "alumniSubmissions", orphanArticle.id), {
    status: "published",
    linkedBlogId: null,
    publishedBlogId: "missing-blog-document",
  });
  await login(authorA);
  await deleteDoc(doc(db, "alumniSubmissions", orphanArticle.id));
  assert.equal((await adminDb.doc(`alumniSubmissions/${orphanArticle.id}`).get()).exists, false);
  assert.equal((await adminDb.doc("blogs/missing-blog-document").get()).exists, false);
  console.log("PASS owner deletes orphaned submission without targeting missing blog");

  await login(superAdmin);
  const normalBlogId = "normal-admin-blog-test";
  await setDoc(doc(db, "blogs", normalBlogId), {
    title: "Normal admin blog",
    slug: normalBlogId,
    category: "Club News",
    content: "Test content",
    featuredImage: "",
    status: "Draft",
    isAlumniContribution: false,
  });
  await deleteDoc(doc(db, "blogs", normalBlogId));
  assert.equal((await adminDb.doc(`blogs/${normalBlogId}`).get()).exists, false);
  console.log("PASS normal Super Admin blog deletion");

  // Super Admin can request changes and reject; Alumni cannot perform these transitions.
  await login(authorA);
  const reviewArticle = await createSubmission(authorA, "Review article", "pending");
  await login(superAdmin);
  await updateDoc(doc(db, "alumniSubmissions", reviewArticle.id), { status: "changes_requested" });
  await updateDoc(doc(db, "alumniSubmissions", reviewArticle.id), { status: "rejected" });
  await deleteDoc(doc(db, "alumniSubmissions", reviewArticle.id));
  console.log("PASS Super Admin request changes, reject, and delete");

  console.log("All Alumni Firestore rules scenarios passed.");
} finally {
  await signOut(auth).catch(() => {});
  await deleteApp(clientApp);
  await adminApp.delete();
}
