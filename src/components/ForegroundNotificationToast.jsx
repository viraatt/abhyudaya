import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiExternalLink } from "react-icons/fi";
import { listenToForegroundMessages } from "../services/notificationService";
import logoImg from "../assets/logo-120.png";
import "./ForegroundNotificationToast.css";

export default function ForegroundNotificationToast() {
  const [activeNotification, setActiveNotification] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe = null;

    listenToForegroundMessages((payload) => {
      const title =
        payload.notification?.title ||
        payload.data?.title ||
        "Abhyudaya Club";
      const body =
        payload.notification?.body ||
        payload.data?.body ||
        "New update from Abhyudaya Club!";
      const link =
        payload.data?.link ||
        payload.data?.url ||
        payload.fcmOptions?.link ||
        null;
      const icon =
        payload.notification?.icon ||
        payload.data?.icon ||
        logoImg;

      setActiveNotification({
        id: Date.now(),
        title,
        body,
        link,
        icon,
      });
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!activeNotification) return undefined;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  if (!activeNotification) return null;

  const handleAction = () => {
    if (activeNotification.link) {
      if (activeNotification.link.startsWith("http")) {
        window.open(activeNotification.link, "_blank", "noopener,noreferrer");
      } else {
        navigate(activeNotification.link);
      }
    }
    setActiveNotification(null);
  };

  return (
    <div className="foreground-toast" role="alert" aria-live="assertive">
      <div className="foreground-toast__header">
        <div className="foreground-toast__brand">
          <img
            src={activeNotification.icon || logoImg}
            alt="Abhyudaya"
            className="foreground-toast__icon"
          />
          <span className="foreground-toast__source">Abhyudaya Notice</span>
        </div>
        <button
          type="button"
          className="foreground-toast__close"
          onClick={() => setActiveNotification(null)}
          aria-label="Close notification"
        >
          <FiX size={16} />
        </button>
      </div>

      <div className="foreground-toast__body">
        <h4 className="foreground-toast__title">{activeNotification.title}</h4>
        <p className="foreground-toast__text">{activeNotification.body}</p>
      </div>

      <div className="foreground-toast__footer">
        <button
          type="button"
          className="foreground-toast__btn foreground-toast__btn--dismiss"
          onClick={() => setActiveNotification(null)}
        >
          Dismiss
        </button>
        {activeNotification.link && (
          <button
            type="button"
            className="foreground-toast__btn foreground-toast__btn--link"
            onClick={handleAction}
          >
            <span>View</span>
            <FiExternalLink size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
