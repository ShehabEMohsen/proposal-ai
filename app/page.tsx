"use client";

import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// const projectTypes = [
//   "Web Design",
//   "Mobile App",
//   "Branding",
//   "Consulting",
//   "Custom",
// ];
// const tones = ["Professional", "Friendly", "Formal"];

export default function Home() {
  const [form, setForm] = useState({ yourName: "", notes: "" });
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [proposal, loading]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generate = async () => {
    if (!form.notes.trim()) return;
    setLoading(true);
    setProposal("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok || !res.body) {
        alert("Something went wrong.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        const header = `
          <div class="proposal-header">
            <div class="proposal-header-left">
              <div class="proposal-brand">${form.yourName || "Your Agency"}</div>
              <div class="proposal-meta">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
            <div class="proposal-header-right">
              <div class="proposal-badge">PROPOSAL</div>
            </div>
          </div>
          <hr class="proposal-divider" />
        `;

        setProposal(header + fullText);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    if (outputRef.current) {
      navigator.clipboard.writeText(outputRef.current.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadPDF = async () => {
    const element = outputRef.current;
    if (!element) return;
    setPdfLoading(true);

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas-pro");

      // Temporarily expand element to full width for clean capture
      const originalWidth = element.style.width;
      element.style.width = "750px";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 750,
      });

      element.style.width = originalWidth;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidthMM = 210;
      const pageHeightMM = 297;
      const marginMM = 12;

      const usableWidth = pageWidthMM - marginMM * 2;
      const usableHeight = pageHeightMM - marginMM * 2;

      // How many canvas pixels = 1mm
      const pxPerMM = canvas.width / usableWidth;
      const pageHeightPx = usableHeight * pxPerMM;

      let yPx = 0;
      let pageNum = 0;

      while (yPx < canvas.height) {
        if (pageNum > 0) pdf.addPage();

        // Find a safe cut point — scan upward from the ideal cut
        // to avoid slicing through a row of content
        let cutAt = Math.min(yPx + pageHeightPx, canvas.height);

        // Scan up to 80px upward to find a whiter row (natural gap)
        const ctx = canvas.getContext("2d");
        if (ctx && cutAt < canvas.height) {
          for (let scan = cutAt; scan > cutAt - 80; scan--) {
            const pixel = ctx.getImageData(0, scan, canvas.width, 1).data;
            let isLight = true;
            for (let i = 0; i < pixel.length; i += 4) {
              if (pixel[i] < 240 || pixel[i + 1] < 240 || pixel[i + 2] < 240) {
                isLight = false;
                break;
              }
            }
            if (isLight) {
              cutAt = scan;
              break;
            }
          }
        }

        const sliceHeightPx = cutAt - yPx;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;

        const sliceCtx = sliceCanvas.getContext("2d");
        if (!sliceCtx) break;

        sliceCtx.drawImage(
          canvas,
          0,
          yPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx,
        );

        const sliceMM = sliceHeightPx / pxPerMM;
        pdf.addImage(
          sliceCanvas.toDataURL("image/png"),
          "PNG",
          marginMM,
          marginMM,
          usableWidth,
          sliceMM,
        );

        yPx = cutAt;
        pageNum++;
      }

      pdf.save(`Proposal.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Failed to generate PDF.");
    } finally {
      setPdfLoading(false);
    }
  };
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
 
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
        :root {
          --cream: #F7F4EF;
          --ink: #1A1714;
          --ink-light: #6B6560;
          --accent: #C8522A;
          --accent-light: #F5EDE8;
          --border: #E2DDD8;
          --white: #FFFFFF;
        }
 
        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--ink);
          min-height: 100vh;
        }
 
        .page-wrap {
          max-width: 780px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }
 
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 0 0;
          margin-bottom: 72px;
        }
 
        .nav-logo {
          font-family: 'Instrument Serif', serif;
          font-size: 22px;
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 8px;
        }
 
        .nav-logo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          margin-bottom: 2px;
        }
 
        .nav-tag {
          font-size: 12px;
          color: var(--ink-light);
          border: 1px solid var(--border);
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 400;
        }
 
        .hero {
          margin-bottom: 56px;
        }
 
        .hero-eyebrow {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 16px;
        }
 
        .hero-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(38px, 6vw, 56px);
          line-height: 1.1;
          color: var(--ink);
          margin-bottom: 20px;
          max-width: 580px;
        }
 
        .hero-title em {
          font-style: italic;
          color: var(--accent);
        }
 
        .hero-sub {
          font-size: 16px;
          color: var(--ink-light);
          line-height: 1.65;
          max-width: 480px;
          font-weight: 300;
        }
 
        .form-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 36px;
          margin-bottom: 40px;
          box-shadow: 0 2px 24px rgba(26,23,20,0.04);
        }
 
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-light);
          margin-bottom: 8px;
        }
 
        .field-input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: var(--ink);
          background: var(--cream);
          outline: none;
          transition: border-color 0.15s;
          margin-bottom: 24px;
        }
 
        .field-input:focus {
          border-color: var(--accent);
          background: var(--white);
        }
 
        .field-input::placeholder { color: #B0AAA4; }
 
        .field-textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          line-height: 1.7;
          color: var(--ink);
          background: var(--cream);
          outline: none;
          resize: vertical;
          min-height: 220px;
          transition: border-color 0.15s;
          margin-bottom: 28px;
        }
 
        .field-textarea:focus {
          border-color: var(--accent);
          background: var(--white);
        }
 
        .field-textarea::placeholder { color: #B0AAA4; font-size: 13px; line-height: 1.8; }
 
        .hint {
          font-size: 12px;
          color: var(--ink-light);
          margin-top: -20px;
          margin-bottom: 24px;
          font-weight: 300;
        }
 
        .btn-generate {
          width: 100%;
          background: var(--ink);
          color: var(--white);
          border: none;
          border-radius: 10px;
          padding: 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
 
        .btn-generate:hover:not(:disabled) { background: #2E2A26; transform: translateY(-1px); }
        .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
 
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
 
        @keyframes spin { to { transform: rotate(360deg); } }
 
        .output-wrap {
          animation: fadeUp 0.4s ease;
        }
 
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
 
        .output-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
 
        .output-label {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-light);
          display: flex;
          align-items: center;
          gap: 8px;
        }
 
        .output-label-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2ECC7A;
          animation: pulse 1.5s infinite;
        }
 
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
 
        .toolbar-actions { display: flex; gap: 8px; }
 
        .btn-action {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--white);
          color: var(--ink);
          transition: all 0.15s;
        }
 
        .btn-action:hover:not(:disabled) { background: var(--cream); border-color: var(--ink-light); }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
 
        .btn-action-primary {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
 
        .btn-action-primary:hover:not(:disabled) { background: #B3461F; border-color: #B3461F; }
 
        .proposal-output {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 48px 52px;
          box-shadow: 0 2px 24px rgba(26,23,20,0.05);
          font-family: 'DM Sans', sans-serif;
        }
 
        .proposal-output.streaming::after {
          content: "▍";
          display: inline-block;
          animation: blink 0.6s step-end infinite;
          color: var(--accent);
          margin-left: 2px;
        }
 
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
 
        .proposal-output .proposal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
 
        .proposal-output .proposal-brand {
          font-family: 'Instrument Serif', serif;
          font-size: 22px;
          color: var(--ink);
          margin-bottom: 4px;
        }
 
        .proposal-output .proposal-meta {
          font-size: 13px;
          color: var(--ink-light);
          line-height: 1.6;
        }
 
        .proposal-output .proposal-badge {
          background: var(--ink);
          color: white;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          padding: 6px 12px;
          border-radius: 4px;
        }
 
        .proposal-output .proposal-divider {
          border: none;
          border-top: 1.5px solid var(--ink);
          margin-bottom: 32px;
        }
 
        .proposal-output h2 {
          font-family: 'Instrument Serif', serif;
          font-size: 20px;
          color: var(--ink);
          margin-top: 36px;
          margin-bottom: 12px;
          font-weight: 400;
        }
 
        .proposal-output p {
          font-size: 15px;
          line-height: 1.75;
          color: #3D3830;
          margin-bottom: 12px;
          font-weight: 300;
        }
 
        .proposal-output ul {
          padding-left: 0;
          margin-bottom: 16px;
          list-style: none;
        }
 
        .proposal-output li {
          font-size: 15px;
          line-height: 1.7;
          color: #3D3830;
          margin-bottom: 8px;
          padding-left: 20px;
          position: relative;
          font-weight: 300;
        }
 
        .proposal-output li::before {
          content: "→";
          position: absolute;
          left: 0;
          color: var(--accent);
          font-size: 13px;
        }
 
        .proposal-output table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0 24px;
          font-size: 14px;
        }
 
        .proposal-output th {
          background: var(--cream);
          text-align: left;
          padding: 10px 14px;
          border: 1px solid var(--border);
          font-weight: 500;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-light);
        }
 
        .proposal-output td {
          padding: 10px 14px;
          border: 1px solid var(--border);
          color: #3D3830;
          font-weight: 300;
        }
 
        .proposal-output tr:nth-child(even) td { background: #FAFAF8; }
 
        .footer {
          text-align: center;
          padding-top: 48px;
          font-size: 13px;
          color: var(--ink-light);
          font-weight: 300;
        }
 
        .footer span { color: var(--accent); }
      `}</style>

      <div className="page-wrap">
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-dot" />
            ProposeAI
          </div>
          <span className="nav-tag">Powered by Gemini 2.5</span>
        </nav>
        <div className="hero">
          <p className="hero-eyebrow">For Freelancers & Consultants</p>
          <h1 className="hero-title">
            Turn messy notes into a <em>winning proposal</em>
          </h1>
          <p className="hero-sub">
            Paste your raw meeting notes. Get a polished, client-ready proposal
            in seconds — no templates, no forms.
          </p>
        </div>
        <div className="form-card">
          <label className="field-label">Your name or agency</label>
          <input
            name="yourName"
            value={form.yourName}
            onChange={handleChange}
            placeholder="e.g. Sarah Al-Hassan / Pixel Studio"
            className="field-input"
          />

          <label className="field-label">Paste your meeting notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="field-textarea"
            placeholder={`Don't worry about formatting — just dump everything here.
 
Example:
- Client is Ahmed, runs a logistics company in Dubai
- Needs a new website + shipment tracking portal
- Budget around 10-20k, timeline is 8 weeks
- They use an internal system called LogiTrack
- Follow up: send proposal by Wednesday`}
          />
          <p className="hint">
            The messier your notes, the more impressive the result.
          </p>

          <button
            className="btn-generate"
            onClick={generate}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Writing your proposal...
              </>
            ) : (
              "Generate Proposal →"
            )}
          </button>
        </div>
        {proposal && (
          <div className="output-wrap">
            <div className="output-toolbar">
              <div className="output-label">
                {loading && <div className="output-label-dot" />}
                {loading ? "Generating" : "Your proposal"}
              </div>
              <div className="toolbar-actions">
                <button
                  className="btn-action"
                  onClick={copyText}
                  disabled={loading}
                >
                  {copied ? "Copied ✓" : "Copy text"}
                </button>
                <button
                  className="btn-action btn-action-primary"
                  onClick={downloadPDF}
                  disabled={loading || pdfLoading}
                >
                  {pdfLoading ? "Generating PDF..." : "Download PDF"}
                </button>
              </div>
            </div>

            <div
              id="proposal-output"
              ref={outputRef}
              className={`proposal-output${loading ? " streaming" : ""}`}
              dangerouslySetInnerHTML={{ __html: proposal }}
            />
            <div ref={bottomRef} />
          </div>
        )}

        <div className="footer">
          Built with <span>♥</span> using Next.js & Gemini 2.5 Flash
        </div>
      </div>
    </>
  );
}
