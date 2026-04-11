// USNDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import USNList from "./USNList";
import USNDetail from "./USNDetail";
import ActionSummary from "./ActionSummary"; // optional component
import { socket } from "../services/socket";
import semver from "semver";

export default function USNDashboard() {
  const [usns, setUsns] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedUSN, setSelectedUSN] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [actionsLog, setActionsLog] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    fetch("http://localhost:7000/api/usn")
      .then((res) => res.json())
      .then((data) => setUsns(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch USNs:", err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:7000/api/agents")
      .then((res) => res.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch agents:", err));
  }, []);

  useEffect(() => {
    const handleAgentAction = (data) => {
      setActionsLog((prev) => [...prev, data]);
      if (selectedAgent?.id === data.agentId) {
        alert(`Action executed: ${data.action} on ${data.filePath || "package"}`);
      }
    };

    socket.on("agentAction", handleAgentAction);
    return () => socket.off("agentAction", handleAgentAction);
  }, [selectedAgent]);

  const isVersionVulnerable = (agentVersion, affectedRanges) => {
    if (!agentVersion || !Array.isArray(affectedRanges)) return false;
    return affectedRanges.some((range) => semver.satisfies(agentVersion, range));
  };

  const filteredUsns = useMemo(() => {
    return usns
      .filter((usn) => {
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return [usn.usnId, usn.package, usn.riskLevel]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(lower));
      })
      .filter((usn) => {
        if (riskFilter === "all") return true;
        return usn.riskLevel === riskFilter;
      });
  }, [usns, searchTerm, riskFilter]);

  const agentVulnerabilities = useMemo(
    () =>
      agents.map((agent) => {
        const vulnerableUSNs = usns.filter((usn) =>
          isVersionVulnerable(agent.version || agent.nodeVersion || "", usn.affectedVersions)
        );
        return { agent, vulnerableUSNs };
      }),
    [agents, usns]
  );

  const selectedAgentVersion = selectedAgent?.version || selectedAgent?.nodeVersion || "";
  const selectedAgentVulnerableCount = selectedAgent
    ? agentVulnerabilities.find((item) => item.agent.id === selectedAgent.id)?.vulnerableUSNs.length || 0
    : 0;
  const activeAgents = agents.filter((agent) => agent.status === "active").length;

  return (
    <div className="container mt-4">
      <div className="row gy-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row gap-3 align-items-start align-items-md-center justify-content-between">
            <div>
              <h2>USN Dashboard</h2>
              <p className="text-muted mb-0">Find vulnerable packages, choose an agent, and take action quickly.</p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <span className="badge bg-primary py-2 px-3">Total USNs: {usns.length}</span>
              <span className="badge bg-success py-2 px-3">Active agents: {activeAgents}</span>
              <span className="badge bg-danger py-2 px-3">Selected Vulnerable USNs: {selectedAgent ? selectedAgentVulnerableCount : 0}</span>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="row gy-3 align-items-center">
                <div className="col-md-4">
                  <label className="form-label">Select agent</label>
                  <select
                    className="form-select"
                    value={selectedAgent?.id || ""}
                    onChange={(e) => {
                      const next = agents.find((agent) => agent.id === e.target.value);
                      setSelectedAgent(next || null);
                    }}
                  >
                    <option value="">Choose an agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.os || "unknown"})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Search USN</label>
                  <input
                    className="form-control"
                    placeholder="Search package, USN ID, or risk"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Risk level</label>
                  <select className="form-select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                    <option value="all">All risks</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <USNList
            usns={filteredUsns}
            selected={selectedUSN}
            onSelect={setSelectedUSN}
            selectedAgentVersion={selectedAgentVersion}
            isVersionVulnerable={isVersionVulnerable}
          />
        </div>

        <div className="col-lg-5">
          <USNDetail notice={selectedUSN} agent={selectedAgent} />
        </div>

        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">Agent vulnerability summary</h5>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Agent</th>
                      <th>OS</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Vulnerable USNs</th>
                      <th>Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentVulnerabilities.map(({ agent, vulnerableUSNs }) => (
                      <tr
                        key={agent.id}
                        className={selectedAgent?.id === agent.id ? "table-primary" : ""}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <td>{agent.name}</td>
                        <td>{agent.os || "—"}</td>
                        <td>{agent.version || agent.nodeVersion || "—"}</td>
                        <td>
                          <span className={`badge ${agent.status === "active" ? "bg-success" : "bg-secondary"}`}>
                            {agent.status || "unknown"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${vulnerableUSNs.length > 0 ? "bg-danger" : "bg-success"}`}>
                            {vulnerableUSNs.length}
                          </span>
                        </td>
                        <td>{agent.lastSeen ? new Date(agent.lastSeen).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <ActionSummary actions={actionsLog} />
        </div>
      </div>
    </div>
  );
}
