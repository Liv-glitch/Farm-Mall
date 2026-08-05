// Farm Decision Report — EJS template source, kept as a plain TS string export
// (instead of a standalone .ejs file) so it compiles into dist/ automatically
// with `tsc` and never needs a separate "copy static assets" build step on
// this project's shared-hosting deployment.
//
// Rendered via ejs.render() in report-renderer.service.ts. Do not rename the
// `<%= %>`/`<% %>` locals below without updating that service and
// decision-report.service.ts, which populate the DecisionReportData shape.

export const FARM_DECISION_REPORT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Farm Decision Report \u2014 <%= summary.locationLabel %>, <%= summary.countyMetaLabel.split(' \u00b7 ')[0] %></title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#FAF8F1;
    --paper-panel:#F1EDE0;
    --paper-brand:#F7F0D2;
    --ink:#22301E;
    --ink-soft:#54604C;
    --line:#D8D2BE;
    --olive:#2D8A4E;
    --olive-dark:#217A2D;
    --soil:#6E3B1E;
    --gold:#FFD700;
    --pos:#3A5C2E; --pos-bg:#E9F1E1; --pos-bd:#B9CFA8;
    --neg:#8A3420; --neg-bg:#F8E7E1; --neg-bd:#E0A88F;
    --conf-high-fg:#217A2D; --conf-high-bg:#E9F1E1; --conf-high-bd:#B9CFA8;
    --conf-med-fg:#8A5A0F; --conf-med-bg:#FBF0DC; --conf-med-bd:#E7C88A;
    --conf-low-fg:#8A3420; --conf-low-bg:#F8E7E1; --conf-low-bd:#E0A88F;
  }
  *{box-sizing:border-box;}
  body{margin:0; background:#DCD6C4; color:var(--ink); font-family:'Inter',sans-serif; font-size:14.5px; line-height:1.6; -webkit-font-smoothing:antialiased;}
  .sheet{max-width:860px; margin:32px auto; background:var(--paper); padding:56px 60px 48px; border:1px solid var(--line); box-shadow:0 18px 45px rgba(110,59,30,.14);}
  h1,h2,h3{font-family:'Fraunces',serif; font-weight:500; color:var(--olive-dark); margin:0;}
  .eyebrow{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--soil); margin:0 0 6px;}
  .brand-bar{display:flex; align-items:center; gap:10px; margin-bottom:22px;}
  .brand-bar img{height:34px; width:auto; object-fit:contain;}
  .brand-bar .brand-name{font-family:'Fraunces',serif; font-weight:600; font-size:16px; color:var(--olive-dark); border-left:3px solid var(--gold); padding-left:10px;}
  .masthead{display:flex; justify-content:space-between; align-items:flex-end; background:var(--olive-dark); color:#fff; border-bottom:4px solid var(--gold); padding:22px 24px; margin:0 -24px;}
  .masthead h1{font-size:30px; color:#fff;}
  .masthead .eyebrow{color:var(--gold);}
  .masthead .meta{text-align:right; font-size:12px; color:#F6F0D0; font-family:'IBM Plex Mono',monospace;}
  .masthead .meta div{margin-bottom:2px;}
  .disclaimer-tag{font-size:11.5px; color:#F7F3E3; margin:10px 0 0; font-style:italic;}

  .print-bar{max-width:860px; margin:16px auto 0; display:flex; justify-content:flex-end;}
  .print-button{font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.04em; text-transform:uppercase; background:var(--olive-dark); color:#fff; border:1px solid var(--soil); border-bottom:3px solid var(--soil); border-radius:3px; padding:9px 18px; cursor:pointer; display:inline-flex; align-items:center; gap:8px;}
  .print-button:hover{background:var(--soil);}
  .print-button .swatch{width:9px; height:9px; background:var(--gold); border:1px solid rgba(255,255,255,.7); border-radius:50%;}

  section{margin-top:40px;}
  section > h2{font-size:19px; margin-bottom:4px;}
  .section-sub{font-size:12.5px; color:var(--ink-soft); margin:0 0 16px;}

  .summary-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:0; border:1px solid var(--soil); border-top:4px solid var(--gold); margin-top:16px;}
  .summary-cell{padding:14px 16px; border-right:1px solid var(--line); border-bottom:1px solid var(--line);}
  .summary-cell:nth-child(4n){border-right:none;}
  .summary-label{font-family:'IBM Plex Mono',monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--soil);}
  .summary-value{font-size:16px; margin-top:4px; font-weight:500;}
  .summary-value small{display:block; font-size:11.5px; font-weight:400; color:var(--ink-soft); margin-top:2px;}
  .summary-highlight{background:var(--paper-brand);}

  .pred-card{border:1.5px solid var(--olive-dark); margin-top:16px; page-break-inside:avoid;}
  .pred-head{display:flex; justify-content:space-between; align-items:flex-start; background:var(--paper-brand); padding:10px 20px; border-bottom:1px solid var(--line);}
  .pred-num{font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--soil); letter-spacing:.06em;}
  .pred-head h3{font-size:15.5px; margin-top:2px; color:var(--olive-dark);}
  .conf-wrap{display:flex; flex-direction:column; align-items:flex-end; gap:4px; padding-top:2px;}
  .conf-badge{font-family:'IBM Plex Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.05em; padding:3px 9px; border-radius:3px; border:1px solid; white-space:nowrap;}
  .conf-high{background:var(--conf-high-bg); color:var(--conf-high-fg); border-color:var(--conf-high-bd);}
  .conf-medium{background:var(--conf-med-bg); color:var(--conf-med-fg); border-color:var(--conf-med-bd);}
  .conf-low{background:var(--conf-low-bg); color:var(--conf-low-fg); border-color:var(--conf-low-bd);}
  .conf-caption{font-size:10px; color:var(--ink-soft);}

  .assessment{margin:16px 20px 0; padding:11px 16px; background:#FFFBE9; border:1px solid var(--line);}
  .assessment .why-label{margin-bottom:3px;}
  .assessment p{margin:0; font-size:13px; color:var(--ink);}

  .pred-body{padding:16px 20px 20px; display:grid; grid-template-columns:200px 1fr; gap:26px;}
  .pred-value-block{border-right:1px solid var(--line); padding-right:20px;}
  .pred-value{font-family:'Fraunces',serif; font-size:32px; font-weight:600; color:var(--olive-dark); line-height:1.1;}
  .pred-value.small{font-size:24px;}
  .pred-value.warn{color:var(--neg);}
  .pred-label{font-size:12.5px; color:var(--ink-soft); margin-top:4px;}
  .pred-range{font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--ink-soft); margin-top:8px;}

  .why-label{font-family:'IBM Plex Mono',monospace; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--soil); margin:0 0 8px;}
  table.breakdown{width:100%; border-collapse:collapse; font-size:12.5px;}
  table.breakdown th{text-align:left; font-family:'IBM Plex Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--soil); border-bottom:2px solid var(--olive-dark); padding:5px 8px 6px 0;}
  table.breakdown td{padding:8px 8px 8px 0; border-bottom:1px solid var(--line); vertical-align:top;}
  table.breakdown tr:last-child td{border-bottom:none;}
  td.input-name{font-weight:500; width:24%;}
  td.input-value{font-family:'IBM Plex Mono',monospace; font-size:12px; width:15%; color:var(--ink-soft);}
  td.input-meaning{color:var(--ink-soft);}
  .impact-chip{display:inline-block; font-family:'IBM Plex Mono',monospace; font-size:11.5px; font-weight:500; padding:2px 7px; border-radius:3px; margin-right:8px; white-space:nowrap;}
  .impact-pos{background:var(--pos-bg); color:var(--olive-dark);}
  .impact-neg{background:var(--neg-bg); color:var(--neg);}
  .impact-neutral{background:var(--paper-panel); color:var(--ink-soft); border:1px solid var(--line); font-family:'Inter',sans-serif; font-size:11px;}

  .disease-list{margin-top:6px;}
  .disease-row{display:grid; grid-template-columns:140px 90px 1fr; gap:14px; padding:10px 0; border-bottom:1px solid var(--line); align-items:baseline;}
  .disease-row:last-child{border-bottom:none;}
  .disease-row .d-name{font-weight:500; font-size:13.5px;}
  .disease-row .d-risk{font-family:'IBM Plex Mono',monospace; font-size:10.5px; text-transform:uppercase; padding:2px 8px; border-radius:3px; text-align:center; border:1px solid;}
  .d-risk.high{background:var(--neg-bg); color:var(--neg); border-color:var(--neg-bd);}
  .d-risk.moderate{background:var(--conf-med-bg); color:var(--conf-med-fg); border-color:var(--conf-med-bd);}
  .d-risk.low{background:var(--pos-bg); color:var(--pos); border-color:var(--pos-bd);}
  .disease-row .d-why{font-size:12.5px; color:var(--ink-soft);}

  .variety-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:6px;}
  .variety-card{border:1px solid var(--line); border-top:3px solid var(--soil); padding:14px 16px; position:relative; background:#FFFDF4;}
  .variety-card.rank-1{border:2px solid var(--olive-dark); border-top:4px solid var(--gold);}
  .rank-badge{font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--soil); letter-spacing:.05em;}
  .variety-name{font-family:'Fraunces',serif; font-size:17px; font-weight:600; color:var(--olive-dark); margin:2px 0 2px;}
  .variety-score{font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--ink-soft); margin-bottom:10px;}
  .variety-card ul{margin:0; padding-left:16px; font-size:12px; color:var(--ink-soft);}
  .variety-card li{margin-bottom:3px;}

  footer.report-footer{margin-top:40px; padding-top:16px; border-top:2px solid var(--olive-dark); font-size:11px; color:var(--ink-soft); text-align:center;}

  @media print{
    body{background:#fff; margin:0;}
    .sheet{margin:0; border:none; box-shadow:none; max-width:none; padding:26px 34px;}
    .print-bar, .no-print{display:none !important;}
    section{margin-top:24px;}
    .pred-card{page-break-inside:avoid;}
  }
</style>
</head>
<body>

<div class="print-bar no-print">
  <button class="print-button" onclick="window.print()" type="button">
    <span class="swatch"></span> Print / Save as PDF
  </button>
</div>

<div class="sheet">

  <div class="brand-bar">
    <img src="<%= logoUrl %>" alt="Farm Mall logo">
    <span class="brand-name">Farm Mall</span>
  </div>

  <div class="masthead">
    <div>
      <p class="eyebrow">Farm decision report</p>
      <h1>Season predictions</h1>
      <p class="disclaimer-tag">Decision-support estimates based on submitted field data \u2014 not a substitute for advice from your local extension officer.</p>
    </div>
    <div class="meta">
      <div>Report ID: <%= summary.reportId %></div>
      <div>Generated: <%= summary.generatedAtLabel %></div>
    </div>
  </div>

  <section>
    <h2>Field &amp; crop summary</h2>
    <div class="summary-grid">
      <div class="summary-cell summary-highlight">
        <div class="summary-label">Location</div>
        <div class="summary-value"><%= summary.locationLabel %><small><%= summary.countyMetaLabel %></small></div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">Field size</div>
        <div class="summary-value"><%= summary.fieldSizeLabel %><small><%= summary.waterSourceLabel %></small></div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">Variety candidates</div>
        <div class="summary-value"><%= summary.varietyCandidatesLabel %></div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">Seed source</div>
        <div class="summary-value"><%= summary.seedSourceLabel %></div>
      </div>
      <div class="summary-cell summary-highlight">
        <div class="summary-label">Planting date</div>
        <div class="summary-value"><%= summary.plantingDateLabel %></div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">Previous crop</div>
        <div class="summary-value"><%= summary.previousCropLabel %></div>
      </div>
      <div class="summary-cell">
        <div class="summary-label">Priority</div>
        <div class="summary-value"><%= summary.priorityLabel %></div>
      </div>
      <div class="summary-cell summary-highlight">
        <div class="summary-label">Predictions in this report</div>
        <div class="summary-value"><%= summary.predictionCount %></div>
      </div>
    </div>
  </section>

  <section>
    <h2>Predictions</h2>
    <p class="section-sub">Each prediction shows the estimate, an assessment, and the inputs that produced it \u2014 with the value of each input and its effect on the result.</p>

    <% predictions.forEach(function(pred) { %>
    <div class="pred-card">
      <div class="pred-head">
        <div><div class="pred-num">Prediction <%= pred.index %> of <%= pred.total %></div><h3><%= pred.title %></h3></div>
        <div class="conf-wrap">
          <span class="conf-badge conf-<%= pred.confidence %>"><%= pred.confidence.charAt(0).toUpperCase() + pred.confidence.slice(1) %> confidence</span>
          <span class="conf-caption"><%= pred.confidenceCaption %></span>
        </div>
      </div>
      <div class="assessment">
        <p class="why-label">Assessment</p>
        <p><%= pred.assessment %></p>
      </div>

      <% if (pred.type === 'variety_ranking') { %>
      <div class="pred-body" style="grid-template-columns:1fr;">
        <p class="why-label" style="margin-bottom:2px;"><%= pred.breakdownLabel %></p>
        <div class="variety-grid">
          <% pred.varietyCards.forEach(function(card) { %>
          <div class="variety-card <%= card.rank === 1 ? 'rank-1' : '' %>">
            <div class="rank-badge">RANK <%= card.rank %></div>
            <div class="variety-name"><%= card.name %></div>
            <div class="variety-score">Score: <%= card.score %>/100</div>
            <ul>
              <% card.points.forEach(function(point) { %>
              <li><%= point %></li>
              <% }); %>
            </ul>
          </div>
          <% }); %>
        </div>
      </div>
      <% } else { %>
      <div class="pred-body">
        <div class="pred-value-block">
          <div class="pred-value <%= pred.valueVariant && pred.valueVariant !== 'default' ? pred.valueVariant : '' %>"><%= pred.valueHeadline %><% if (pred.valueUnit) { %><span style="font-size:16px;"><%= pred.valueUnit %></span><% } %></div>
          <% if (pred.valueSubLabel) { %><div class="pred-label"><%= pred.valueSubLabel %></div><% } %>
          <% if (pred.rangeLabel) { %><div class="pred-range"><%= pred.rangeLabel %></div><% } %>
        </div>
        <div>
          <p class="why-label"><%= pred.breakdownLabel %></p>
          <table class="breakdown">
            <tr><th>Input</th><th>Value</th><th>What it means</th></tr>
            <% pred.breakdown.forEach(function(b) { %>
            <tr>
              <td class="input-name"><%= b.input %></td>
              <td class="input-value"><%= b.value %></td>
              <td class="input-meaning"><span class="impact-chip impact-<%= b.impactType %>"><%= b.impactLabel %></span><%= b.meaning %></td>
            </tr>
            <% }); %>
          </table>
        </div>
      </div>
      <% if (pred.type === 'disease_risk' && pred.otherRisks && pred.otherRisks.length) { %>
      <div class="pred-body" style="border-top:1px solid var(--line); padding-top:16px;">
        <div class="pred-value-block" style="border-right:none;">
          <p class="why-label" style="margin-bottom:8px;">Other risks tracked</p>
        </div>
        <div class="disease-list" style="width:100%;">
          <% pred.otherRisks.forEach(function(r) { %>
          <div class="disease-row">
            <div class="d-name"><%= r.name %></div>
            <div class="d-risk <%= r.risk %>"><%= r.risk.charAt(0).toUpperCase() + r.risk.slice(1) %></div>
            <div class="d-why"><%= r.why %></div>
          </div>
          <% }); %>
        </div>
      </div>
      <% } %>
      <% } %>
    </div>
    <% }); %>

  </section>

  <footer class="report-footer">
    Generated by Farm Mall \u00b7 <%= summary.generatedAtLabel %> \u00b7 For decision-support purposes only \u2014 always confirm major decisions with your local agricultural extension officer.
  </footer>

</div>
</body>
</html>`;
