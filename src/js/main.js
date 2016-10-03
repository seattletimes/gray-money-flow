require("component-responsive-frame/child");

var { transactions, pacs } = window.grayMoney;
var lookup = {};

// build lookup table
transactions.forEach(function(row, index) {
  if (!lookup[row.recipient]) lookup[row.recipient] = {
    donations: [],
    pac: row.recipient
  };
  row.id = index;
  lookup[row.recipient].donations.push(row);
});

// second run to build the dependency graph
for (var k in lookup) {
  var pac = lookup[k];
  if (pacs[k]) {
    pac.note = pacs[k].note;
    pac.raised = pacs[k].raised || 0;
  }
  pac.donations.forEach(function(d) {
    var donor = d.donor;
    d.donor = lookup[donor] || { pac: donor, donations: [] };
    var detail = pacs[donor];
    if (detail) {
      if (detail.note) d.donor.note = detail.note;
      d.donor.raised = detail.raised || 0;
    }
  });
}

var roots = ["New Direction", "Working Families"];

roots.forEach(function(r) {
  var renderDonations = function(d) {
    return `
    <li>${d.amount} - ${d.donor.pac}
      <ul>${d.donor.donations.map(renderDonations).join("")}</ul>
    </li>`;
  };
  var root = lookup[r];
  console.log(root);
  document.body.innerHTML += `
    <h1>${root.pac}</h1>
    <p>Raised: ${root.raised} - ${root.note || "No note"}
    <ul>${root.donations.map(renderDonations).join("")}</ul>
  `
})