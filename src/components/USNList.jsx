import React from "react";

export default function USNList({ onSelect, selected, usns, selectedAgentVersion, isVersionVulnerable }) {
  return (
    <div className="container mt-4 p-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-1">USN Updates</h3>
          <p className="text-muted mb-0">Click a USN to see details and recommended actions.</p>
        </div>
        <span className="badge bg-secondary py-2 px-3">{usns.length} results</span>
      </div>

      {usns.length === 0 && (
        <div className="card text-center text-muted p-4 shadow-sm">
          No USN records found.
        </div>
      )}

      <div className="row g-3">
        {usns.map((usn) => {
          const vulnerable = selectedAgentVersion && isVersionVulnerable(selectedAgentVersion, usn.affectedVersions);
          return (
            <div className="col-12 col-md-6 col-lg-4" key={usn.usnId}>
              <div
                className={
                  "card shadow-sm h-100 position-relative " +
                  (selected?.usnId === usn.usnId ? "border-primary" : "")
                }
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(usn)}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{usn.usnId}</h5>
                    {usn.riskLevel && (
                      <span className={`badge ${
                        usn.riskLevel === "critical" ? "bg-danger" :
                        usn.riskLevel === "high" ? "bg-warning text-dark" :
                        usn.riskLevel === "medium" ? "bg-info text-dark" :
                        "bg-secondary"
                      }`}>{usn.riskLevel}</span>
                    )}
                  </div>

                  <p className="mb-1"><strong>Package:</strong> {usn.package || "—"}</p>
                  <p className="mb-1"><strong>Published:</strong> {new Date(usn.publishedAt).toLocaleDateString()}</p>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <span className={`badge ${vulnerable ? "bg-danger" : "bg-success"}`}>
                      {vulnerable ? "Selected agent vulnerable" : "Not vulnerable"}
                    </span>
                    <span className="badge bg-light text-dark">CVEs: {Array.isArray(usn.cves) ? usn.cves.length : 0}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
