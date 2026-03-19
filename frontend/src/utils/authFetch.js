const authFetch = async (url, options = {}) => {

  const token =
  typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;

  const res = await fetch(`https://cab-safety.onrender.com${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  return res;
};

export default authFetch;