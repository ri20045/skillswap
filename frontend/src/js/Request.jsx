// src/Request.jsx
import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";

const Request = ({ user }) => {
  const [mentors, setMentors] = useState([]);
  const [searchSkill, setSearchSkill] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null); // { mentor, skill }
  const [message, setMessage] = useState("");
  const toast = useToast();

  // Fetch all users (mentors)
  useEffect(() => {
    if (!user?.email) return;
    fetch(`http://localhost:4000/api/match/${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        setMentors(data.filter((u) => u.email !== user.email));
      })
      .catch((err) => console.error(err));
  }, [user]);

  const handleSearch = () => {
    const results = mentors.filter((m) =>
      m.skillsIHave.some((skill) =>
        skill.toLowerCase().includes(searchSkill.toLowerCase())
      )
    );
    setSearchResults(results);
  };

  const sendRequest = async () => {
    if (!selectedRequest) return;
    try {
      const res = await fetch("http://localhost:4000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderEmail: user.email,
          senderName: user.name,
          receiverEmail: selectedRequest.mentor.email,
          skill: selectedRequest.skill,
          message,
        }),
      });

      if (!res.ok) throw new Error("Failed to send request");
      toast("Request sent!", "success");
      setSelectedRequest(null);
      setMessage("");
    } catch (err) {
      console.error(err);
      toast("Could not send request. Please try again.", "error");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Request Help / Browse Skills</h2>
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          value={searchSkill}
          onChange={(e) => setSearchSkill(e.target.value)}
          placeholder="Search skill (e.g., HTML)"
          className="border p-2 rounded flex-1"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {searchResults.length === 0 && searchSkill && (
        <p className="text-gray-500">No mentors found for "{searchSkill}"</p>
      )}

      <div className="space-y-4">
        {searchResults.map((mentor) => {
          const skillsMatching = mentor.skillsIHave.filter((s) =>
            s.toLowerCase().includes(searchSkill.toLowerCase())
          );
          return (
            <div key={mentor.email} className="border p-4 rounded bg-gray-50">
              <h3 className="font-bold">{mentor.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {skillsMatching.map((s) => (
                  <span
                    key={s}
                    className="bg-purple-100 text-purple-800 px-2 py-1 rounded cursor-pointer"
                    onClick={() => {
                      setSelectedRequest({ mentor, skill: s });
                      setMessage("");
                    }}
                  >
                    {s} 💬
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Request modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-semibold">
              Message {selectedRequest.mentor.name} about {selectedRequest.skill}
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message"
              className="w-full h-32 border rounded p-3"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setMessage("");
                }}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={sendRequest}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Request;
