const authFetch = async (url, options = {}) => {

  const token = localStorage.getItem("token");

  const res = await fetch(`http://localhost:5000${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  return res;
};

export default authFetch;