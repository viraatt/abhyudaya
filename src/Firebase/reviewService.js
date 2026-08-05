import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "./firebase";

const reviewsRef = collection(db, "event_reviews");

function formatReviewDoc(snapshotDoc) {
  return { id: snapshotDoc.id, ...snapshotDoc.data() };
}

export function sortReviews(reviews) {
  return [...reviews].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return b.featured ? 1 : -1;
    }
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
}

export function computeReviewStats(reviews) {
  const total = reviews.length;
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (total === 0) {
    return { average: 0, total: 0, breakdown };
  }

  let sum = 0;
  reviews.forEach((review) => {
    const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)));
    breakdown[rating] += 1;
    sum += rating;
  });

  return {
    average: Math.round((sum / total) * 10) / 10,
    total,
    breakdown,
  };
}

export async function submitReview(reviewData) {
  const ref = await addDoc(reviewsRef, {
    eventId: reviewData.eventId,
    eventTitle: reviewData.eventTitle || "",
    eventSlug: reviewData.eventSlug || "",
    name: reviewData.name.trim(),
    email: reviewData.email?.trim() || "",
    college: reviewData.college?.trim() || "",
    branch: reviewData.branch?.trim() || "",
    profilePhoto: reviewData.profilePhoto || "",
    rating: Number(reviewData.rating),
    title: reviewData.title?.trim() || "",
    message: reviewData.message?.trim() || "",
    status: "pending",
    featured: false,
    verifiedAttendee: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Paginated query fetching ONLY approved reviews for public website.
 * Limits reads to 5 items per batch.
 */
export async function getApprovedReviewsPage({ eventId = null, pageSize = 5, lastDoc = null } = {}) {
  try {
    const constraints = [where("status", "==", "approved")];

    if (eventId) {
      constraints.push(where("eventId", "==", eventId));
    }

    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(reviewsRef, ...constraints);
    const snapshot = await getDocs(q);

    const reviews = snapshot.docs.map(formatReviewDoc);
    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length === pageSize;

    return { reviews, lastDoc: newLastDoc, hasMore };
  } catch (err) {
    console.warn("getApprovedReviewsPage fallback:", err);
    // Fallback without compound index
    const constraints = [where("status", "==", "approved"), limit(pageSize)];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const fallbackQ = query(reviewsRef, ...constraints);
    const snapshot = await getDocs(fallbackQ);
    let reviews = snapshot.docs.map(formatReviewDoc);
    if (eventId) {
      reviews = reviews.filter((r) => r.eventId === eventId);
    }
    const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return { reviews, lastDoc: newLastDoc, hasMore: snapshot.docs.length === pageSize };
  }
}

export async function getApprovedReviewsForEvent(eventId) {
  const res = await getApprovedReviewsPage({ eventId, pageSize: 20 });
  return sortReviews(res.reviews);
}

export async function getAllReviews() {
  try {
    const q = query(reviewsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(formatReviewDoc);
  } catch (err) {
    const snapshot = await getDocs(reviewsRef);
    return snapshot.docs
      .map(formatReviewDoc)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
}

export async function updateReviewStatus(id, status) {
  await updateDoc(doc(db, "event_reviews", id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleReviewFeatured(id, featured) {
  await updateDoc(doc(db, "event_reviews", id), {
    featured: Boolean(featured),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleReviewVerified(id, verifiedAttendee) {
  await updateDoc(doc(db, "event_reviews", id), {
    verifiedAttendee: Boolean(verifiedAttendee),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteReview(id) {
  await deleteDoc(doc(db, "event_reviews", id));
}
