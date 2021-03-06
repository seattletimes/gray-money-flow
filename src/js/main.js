require("component-responsive-frame/child");

var closest = require("./lib/closest");
var $ = require("./lib/qsa");

var formatMoney = function(n) {
  return n.toLocaleString().replace(/\.0+$/, "");
};

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
  div.className = "bar-container";
  div.innerHTML = `
    <h2 data-donor="${pac.pac}">${pac.pac}</h2>
    <div class="bar">${sections.join("\n")}</div>
  `;
  return div;
};

var renderKey = function(pac) {
  var items = pac.donations.map(function(d, i) {
    return `
      <li>
        <span class="dot item-${i}"></span>
        <div class="donation-name">${d.donor.pac}</div>
        <div class="donation-amount">$${formatMoney(d.amount)}</div>
    `
  });
  var key = document.createElement("div");
  key.className = "key-chatter";
  key.innerHTML = `
    <p class="raised cash">${pac.raised ? "Total funding: $" + formatMoney(pac.raised) : ""}
    <p class="donated cash">From top donors: $${formatMoney(pac.funded)}
    <p class="note">${pac.note || ""}
    <h3 class="key">Top donors</h3>
    <ul>${items.join("\n")}</ul>
  `
  return key;
};

var initialize = function(element) {

  var stackContainer = element.querySelector(".bar-stacks");
  var chatter = element.querySelector(".bar-chatter");

  var starter = lookup[element.getAttribute("data-root")];

  // initial setup
  var root = renderBar(starter);
  root.classList.add("level-0");
  stackContainer.appendChild(root);
  chatter.innerHTML = "";
  var key = renderKey(starter)
  key.classList.add("level-0");
  chatter.appendChild(key);

  stackContainer.addEventListener("click", function(e) {
    //check if this is a valid click target
    var id = e.target.getAttribute("data-id");
    var donorName = e.target.getAttribute("data-donor");
    var terminates = e.target.getAttribute("data-terminates") == "true";
    if ((!id && !donorName) || terminates) return;

    // add styling for the new active bar section
    var clickedBar = closest(e.target, ".bar-container");
    var previous = clickedBar.querySelector(".active");
    if (previous) previous.classList.remove("active");
    e.target.classList.add("active");

    //set other bars as either backgrounded or removed
    var allBars = $(".bar-container", stackContainer);
    var clickedIndex = allBars.indexOf(clickedBar);
    allBars.forEach(function(b, i) {
      if (i <= clickedIndex) {
        b.classList.add("backgrounded");
      } else {
        b.parentElement.removeChild(b);
      }
    });

    var donor;

    // did you click the name to jump back up?
    if (donorName) {
      clickedBar.classList.remove("backgrounded");
      donor = lookup[donorName];
    } else {
      // render the new bar and add it to the stack
      donor = transactions[id].donor;
      if (!donor) return console.error("Bad donor", id);
      var stackItem = renderBar(donor)
      stackItem.classList.add(`level-${clickedIndex+1}`);
      stackContainer.appendChild(stackItem);
      var bar = stackItem.querySelector(".bar");

      // FLIP animation out from the clicked section into its new stack location
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
    }

    // add the description
    chatter.innerHTML = "";
    var key = renderKey(donor);
    key.classList.add(`level-${clickedIndex+1}`);
    chatter.appendChild(key);
  })

};

$("main.interactive").forEach(initialize);