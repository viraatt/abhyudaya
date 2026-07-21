import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../../Firebase/firebase";

const eventsRef = collection(db, "events");

async function uploadEventImage(file) {
  if (!file) return "";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "event_images");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/cn11zsvp/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) throw new Error("Cloudinary upload failed.");

  const data = await res.json();
  return data.secure_url;
}

export async function getEvents() {
  const snapshot = await getDocs(eventsRef);
  return snapshot.docs.map((d)=>({id:d.id,...d.data()}));
}

export async function addEvent(eventData,file) {
  const banner=file?await uploadEventImage(file):"";
  const ref=await addDoc(eventsRef,{
    title:eventData.title,
    description:eventData.description,
    date:eventData.date,
    location:eventData.location,
    banner,
    createdAt:serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(id,eventData,file) {
  const eventRef=doc(db,"events",id);
  let banner=eventData.banner||"";
  if(file) banner=await uploadEventImage(file);
  await updateDoc(eventRef,{
    title:eventData.title,
    description:eventData.description,
    date:eventData.date,
    location:eventData.location,
    banner,
  });
}

export async function deleteEvent(id) {
  await deleteDoc(doc(db,"events",id));
}
