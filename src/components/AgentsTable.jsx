import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";

export default function AgentsTable({ onSelect, selected, mode = "navigate", vulnerabilities = [] }) {
  const [agents, setAgents] = useState([]);
  const [usnCounts, setUsnCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("http://localhost:7000/api/agents");
        const data = await res.json();
        setAgents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      }
    }
    loadAgents();
    const interval = setInterval(loadAgents, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Socket: update USN counts in real-time
  useEffect(() => {
    socket.on("usnUpdate", ({ agentId, action }) => {
      setUsnCounts(prev => ({
        ...prev,
        [agentId]: (prev[agentId] || 0) + 1
      }));
    });
    return () => socket.off("usnUpdate");
  }, []);

  const sendHeartbeat = async (agentId) => {
    try {
      await fetch("http://localhost:7000/api/agents/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, status: "active" })
      });
    } catch (err) {
      console.error("Failed to send heartbeat:", err);
    }
  };

  const getOsIcon = (os) => {
    if (!os) return "❔";
    const osName = os.toLowerCase();
    if (osName.includes("win")) return "🪟";
    if (osName.includes("mac") || osName.includes("darwin")) return "🍎";
    if (osName.includes("linux")) return "🐧";
    return "💻";
  };

  const handleRowClick = (agent) => {
    if (mode === "navigate") navigate(`/apps/${agent.id}`);
    else onSelect?.(agent);
  };

  return (
    <div className="container mt-3">
      <h2 className="mb-4">Agents</h2>
      <table className="table table-bordered table-hover shadow-sm">
        <thead className="table-secondary">
          <tr>
            <th>Name</th>
            <th>OS</th>
            <th>IP</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Vulnerable USNs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map(agent => (
            <tr
              key={agent.id}
              style={{ cursor: "pointer", backgroundColor: selected?.id === agent.id ? "#f0f8ff" : "inherit" }}
              onClick={() => handleRowClick(agent)}
            >
              <td className="fw-bold">{agent.name}</td>
              <td><span className="me-2">{getOsIcon(agent.os)}</span>{agent.os || "Unknown"}</td>
              <td>{agent.ip || "—"}</td>
              <td>
                <span className={`badge px-3 py-2 ${agent.status === "active" ? "text-bg-success" : "text-bg-danger"}`}>
                  {agent.status}
                </span>
              </td>
              <td>{agent.lastSeen ? new Date(agent.lastSeen).toLocaleString() : "—"}</td>
              <td>{vulnerabilities.find(v => v.agent.id === agent.id)?.vulnerableUSNs.length ?? usnCounts[agent.id] ?? 0}</td>
              <td>
                <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); sendHeartbeat(agent.id); }}>
                  Ping
                </button>
              </td>
            </tr>
          ))}
          {agents.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center text-muted py-3">No agents connected.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
