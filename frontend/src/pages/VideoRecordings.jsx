import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/videoRecording.css";
import authFetch from "../utils/authFetch";

const VideoRecordings = () => {

  const navigate = useNavigate();

  const [recordings, setRecordings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [sort, setSort] = useState("newest");
  const [dateFilter, setDateFilter] = useState("");

  const fetchRecordings = async () => {

    try {

      const res = await authFetch("/api/video-recordings");
      const data = await res.json();

      setRecordings(data);
      setFiltered(data);

    } catch (err) {

      console.error("Error fetching video recordings:", err);

    }

  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  useEffect(() => {

    let data = [...recordings];

    if (dateFilter) {
      data = data.filter(
        r => r.date === new Date(dateFilter).toLocaleDateString()
      );
    }

    if (sort === "newest") {
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    setFiltered(data);

  }, [sort, dateFilter, recordings]);

  const deleteRecording = async (id) => {

    try {

      authFetch(`/api/video-recordings/${id}`, { method: "DELETE" });
      fetchRecordings();

    } catch (err) {

      console.error("Delete failed:", err);

    }

  };

  return (

    <div className="video-rec-container">

      <button className="video-rec-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <h2 className="video-rec-title">Video Recordings</h2>

      <div className="video-rec-controls">

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>

        <input
          type="date"
          onChange={(e) => setDateFilter(e.target.value)}
        />

      </div>

      {filtered.length === 0 && (
        <p className="video-rec-empty">No recordings found.</p>
      )}

      <div className="video-rec-list">

        {filtered.map((rec) => (

          <div className="video-rec-card" key={rec._id}>

            {/* Small video on the left */}
            <video
              controls
              src={`https://cab-safety.onrender.com/${rec.fileUrl}`}
              className="video-rec-thumb"
            />

            {/* Info + delete on the right */}
            <div className="video-rec-right">

              <div className="video-rec-info">
                <p><strong>Date:</strong> {rec.date}</p>
                <p><strong>Start:</strong> {rec.startTime}</p>
                <p><strong>End:</strong> {rec.endTime}</p>
                <p><strong>Duration:</strong> {rec.duration}s</p>
              </div>

              <button
                className="video-rec-delete-btn"
                onClick={() => deleteRecording(rec._id)}
              >
                Delete
              </button>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

};

export default VideoRecordings;