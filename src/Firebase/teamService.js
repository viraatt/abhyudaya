import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadImage } from "../Admin/pages/services/imageUpload";
import { CATEGORY_BY_LEVEL, LEVELS, VALID_LEVELS, isValidUrl } from "../components/team/teamUtils";

const teamRef = collection(db, "team");

export async function getTeamMembers() {
  try {
    const q = query(teamRef, orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const snapshot = await getDocs(teamRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

/**
 * Validates a team member payload before it is written to Firestore.
 * Throws a descriptive Error if validation fails so the Admin UI can
 * surface it via a toast instead of silently corrupting data.
 */
function validateTeamMemberData(data) {
  if (!data.name || !String(data.name).trim()) {
    throw new Error("Member name is required.");
  }
  if (!data.role || !String(data.role).trim()) {
    throw new Error("Role is required.");
  }
  if (!data.level || !VALID_LEVELS.includes(data.level)) {
    throw new Error("A valid level (faculty-advisor, leadership, core, executive) is required.");
  }
  if (data.level === LEVELS.EXECUTIVE || data.level === LEVELS.CORE) {
    if (!data.department || !String(data.department).trim()) {
      throw new Error("Department is required for Core and Executive members.");
    }
  }
  if (!isValidUrl(data.linkedin)) {
    throw new Error("LinkedIn URL is not valid. Please provide a full https:// URL or leave it empty.");
  }
  if (!isValidUrl(data.github)) {
    throw new Error("GitHub URL is not valid. Please provide a full https:// URL or leave it empty.");
  }
  if (data.order !== undefined && data.order !== null && data.order !== "" && Number.isNaN(Number(data.order))) {
    throw new Error("Display order must be a valid number.");
  }
}

/**
 * Builds the canonical Firestore payload from admin form data.
 * `category` is derived automatically from `level` purely for backward
 * compatibility with any older reader that might still rely on it.
 */
function buildTeamMemberPayload(data, image) {
  const level = data.level || LEVELS.EXECUTIVE;
  return {
    name: String(data.name).trim(),
    role: String(data.role).trim(),
    level,
    department: data.department ? String(data.department).trim() : "",
    category: data.category || CATEGORY_BY_LEVEL[level] || "Executive Board",
    image,
    linkedin: (data.linkedin || "").trim(),
    github: (data.github || "").trim(),
    email: (data.email || "").trim(),
    bio: (data.bio || "").trim(),
    order: data.order !== undefined && data.order !== null && data.order !== "" ? Number(data.order) : 99,
    active: data.active === false ? false : true,
  };
}

export async function addTeamMember(data, imageFile) {
  validateTeamMemberData(data);

  let image = data.image || "";
  if (imageFile) {
    image = await uploadImage(imageFile);
  }

  if (!image) {
    throw new Error("A profile image is required. Please upload an image or provide an image URL.");
  }

  const payload = buildTeamMemberPayload(data, image);

  const ref = await addDoc(teamRef, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTeamMember(id, data, imageFile) {
  validateTeamMemberData(data);

  const memberRef = doc(db, "team", id);
  let image = data.image || "";
  if (imageFile) {
    image = await uploadImage(imageFile);
  }

  if (!image) {
    throw new Error("A profile image is required. Please upload an image or provide an image URL.");
  }

  const payload = buildTeamMemberPayload(data, image);

  await updateDoc(memberRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggles a member's active status without deleting the Firestore document,
 * so the member can be restored later from the Admin Panel.
 */
export async function setTeamMemberActive(id, active) {
  const memberRef = doc(db, "team", id);
  await updateDoc(memberRef, {
    active: Boolean(active),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTeamMember(id) {
  await deleteDoc(doc(db, "team", id));
}

