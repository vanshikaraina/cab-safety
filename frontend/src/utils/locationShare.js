export const shareLiveLocation = (setToast) => {

  const showToast = (msg) => {
    if (typeof setToast === "function") {
      setToast(msg);
    }
  };

  if (!navigator.geolocation) {
    showToast("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;

      navigator.clipboard.writeText(mapLink);

      showToast("📍 Location link copied");
    },

    () => {
      showToast("Unable to retrieve location");
    }
  );
};