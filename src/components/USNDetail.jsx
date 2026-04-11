// USNDetail.jsx
import React, { useEffect, useState } from "react";
import { socket } from "../services/socket";
import semver from "semver";

export default function USNDetail({ notice, agent }) {
  const [actionStatus, setActionStatus] = useState(null);

  // Listen for agent actions via socket
  useEffect(() => {
    if (!notice || !agent) return;

    const handleAgentAction = (data) => {
      // data should have agentId, alertId, action, filePath
      if (data.agentId === agent.id) {
        setActionStatus({
          success: true,
          action: data.action,
          message: `Action "${data.action}" executed successfully`
        });
      }
    };

    socket.on("agentAction", handleAgentAction);
    return () => socket.off("agentAction", handleAgentAction);
  }, [notice, agent]);

  if (!notice) {
    return <p className="text-muted">Select a USN to view details.</p>;
  }

  // Check vulnerability using semver
  const agentVersion = agent?.version || agent?.nodeVersion || "";
  const affectedRanges = notice.affectedVersions || [];
  const vulnerable =
    agent &&
    affectedRanges.some((range) =>
      semver.satisfies(agentVersion, range)
    );

  // Execute action by creating alert in backend
  async function executeAction(action) {
    try {
      const res = await fetch("http://localhost:7000/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          filePath: null,
          changeType: "package",
          reason: `User-triggered USN action: ${action}`,
          severity: "high",
          actionRecommended: action
        })
      });

      const data = await res.json();

      setActionStatus({
        success: true,
        action,
        message: data.message || `Action "${action}" alert created`
      });
    } catch (err) {
      setActionStatus({ success: false, action, message: err.message });
    }
  }

  return (
    <div className="container mt-4 p-0">
      <h4 className="mb-3">USN Detail</h4>
      <div className="card shadow-sm">
        <div className="card-header bg-dark text-white">
          <strong>{notice.usnId}</strong> — {notice.package}
        </div>
        <div className="card-body">
          <div className="mb-3">
            <span className="badge bg-secondary me-2">Risk: {notice.riskLevel || "Unknown"}</span>
            <span className="badge bg-light text-dark">CVEs: {Array.isArray(notice.cves) ? notice.cves.length : 0}</span>
          </div>

          <p><strong>Published:</strong> {new Date(notice.publishedAt).toLocaleDateString()}</p>
          <p><strong>Affected versions:</strong> {Array.isArray(affectedRanges) && affectedRanges.length > 0 ? affectedRanges.join(", ") : "Not available"}</p>
          <p><strong>Recommended Actions:</strong> {notice.recommendedActions?.join(", ") || "—"}</p>
          <p><strong>Compliance:</strong> {notice.complianceFrameworks?.join(", ") || "—"}</p>

          {!agent ? (
            <div className="alert alert-info mt-3">
              Select an agent to see whether this USN affects its installed version.
            </div>
          ) : (
            <>
              <div className="mb-3">
                <h6 className="mb-1">Agent:</h6>
                <p className="mb-1"><strong>Name:</strong> {agent.name}</p>
                <p className="mb-1"><strong>Version:</strong> {agentVersion || "—"}</p>
              </div>

              {vulnerable ? (
                <div className="alert alert-danger mt-3">
                  ⚠️ <strong>Vulnerable</strong> — the selected agent is affected by this USN.
                </div>
              ) : (
                <div className="alert alert-success mt-3">
                  ✅ <strong>Safe</strong> — the selected agent version is not in the affected range.
                </div>
              )}

              {vulnerable && (
                <div className="mt-3">
                  <h6>Recommended action</h6>
                  <div className="btn-group flex-wrap">
                    <button className="btn btn-danger mb-2" onClick={() => executeAction("block")}>Block</button>
                    <button className="btn btn-warning mb-2" onClick={() => executeAction("quarantine")}>Quarantine</button>
                    <button className="btn btn-primary mb-2" onClick={() => executeAction("update")}>Update</button>
                    <button className="btn btn-info mb-2" onClick={() => executeAction("monitor")}>Monitor</button>
                  </div>
                </div>
              )}

              {actionStatus && (
                <div className={`alert mt-3 ${actionStatus.success ? "alert-success" : "alert-danger"}`}>
                  Action {actionStatus.action}: {actionStatus.message}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
