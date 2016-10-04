require("component-responsive-frame/child");

var closest = require("./lib/closest");
var $ = require("./lib/qsa");

var { transactions, pacs } = window.grayMoney;
var lookup = {};

var stackContainer = document.querySelector(".bar-stacks");
var chatter = document.querySelector(".bar-chatter");
var stack = [];

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
  var total = 0;
  pac.donations.forEach(function(d) {
    var donor = d.donor;
    total += d.amount;
    d.donor = lookup[donor] || { pac: donor, donations: [] };
    var detail = pacs[donor];
    if (detail) {
      if (detail.note) d.donor.note = detail.note;
      d.donor.raised = detail.raised || 0;
    }
  });
  pac.funded = total;
}

var starter = lookup["New Direction"];

// render out a bar div with subsections per donor
var renderBar = function(pac) {
  var sections = pac.donations.map(function(d, i) {
    return `
      <div
        class="bar-chunk item-${i}"
        data-id="${d.id}"
        data-terminates="${d.donor.donations.length == 0}"
        style="width: ${(d.amount / pac.funded * 100).toFixed(4)}%"
      ></div>
    `
  });
  var div = document.createElement("div");
  div.className = "bar";
  div.innerHTML = sections.join("\n");
  return div;
};

var renderKey = function(pac) {
  console.log(pac);
  var items = pac.donations.map(function(d, i) {
    return `
      <li>
        <span class="dot item-${i}"></span>
        ${d.donor.pac} - ${d.amount.toLocaleString().replace(/\.0+$/, "")}
    `
  });
  var key = document.createElement("div");
  key.className = "key-chatter";
  key.innerHTML = `
    <h2>${pac.pac}</h2>
    <p class="note">${pac.note || ""}
    <ul>${items.join("\n")}</ul>
  `
  return key;
};

var root = renderBar(starter);
root.classList.add("level-0");
stackContainer.appendChild(root);
chatter.innerHTML = "";
var key = renderKey(starter)
key.classList.add("level-0");
chatter.appendChild(key);

stackContainer.addEventListener("click", function(e) {
  var id = e.target.getAttribute("data-id");
  var terminates = e.target.getAttribute("data-terminates") == "true";
  if (!id || terminates) return;
  var clickedBar = closest(e.target, ".bar");
  //set other bar colors, remove extra bars
  var allBars = $(".bar", stackContainer);
  var clickedIndex = allBars.indexOf(clickedBar);
  allBars.forEach(function(b, i) {
    if (i <= clickedIndex) {
      b.classList.add("backgrounded");
    } else {
      b.parentElement.removeChild(b);
    }
  })
  var donor = transactions[id].donor;
  if (!donor) return console.error("Bad donor", id);
  var bar = renderBar(donor)
  bar.classList.add(`level-${clickedIndex+1}`);
  stackContainer.appendChild(bar);
  var parentBounds = e.target.getBoundingClientRect();
  var childBounds = bar.getBoundingClientRect();
  var flip = {
    x: parentBounds.left - childBounds.left,
    y: parentBounds.top - childBounds.top,
    width: parentBounds.width / childBounds.width,
    height: parentBounds.height / childBounds.height
  }
  bar.style.transform = `translate(${flip.x}px, ${flip.y}px) scale(${flip.width}, ${flip.height})`;
  var reflow = document.body.offsetWidth;
  bar.classList.add("animate");
  bar.style.transform = "";

  chatter.innerHTML = "";
  var key = renderKey(donor);
  key.classList.add(`level-${clickedIndex+1}`);
  chatter.appendChild(key);
})