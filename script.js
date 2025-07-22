let map = L.map('map').setView([-25.2744, 133.7751], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let postcodeLayer;
let selectedPostcodes = [];
let postcodeGeo = null;

fetch("data/postcodes.geojson")
  .then(res => res.json())
  .then(data => {
    postcodeGeo = data;
    const list = new Set();
    data.features.forEach(f => {
      if (f.properties.postcode) list.add(f.properties.postcode);
    });
    const dl = document.getElementById("postcodeList");
    [...list].sort().forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      dl.appendChild(opt);
    });
  });

function searchPostcodes() {
  const input = document.getElementById("postcodeInput").value;
  const colorMode = document.querySelector('input[name="colorMode"]:checked').value;
  const postcodes = input.split(",").map(p => p.trim()).filter(p => p !== "");

  selectedPostcodes = [...new Set([...selectedPostcodes, ...postcodes])];

  if (postcodeLayer) map.removeLayer(postcodeLayer);

  const colors = generateColors(selectedPostcodes.length);
  let legendHTML = "<strong>Legend:</strong><br/>";

  postcodeLayer = L.geoJSON(postcodeGeo, {
    filter: feature => selectedPostcodes.includes(feature.properties.postcode),
    style: feature => {
      const idx = colorMode === "same" ? 0 : selectedPostcodes.indexOf(feature.properties.postcode);
      return {
        color: "black",
        weight: 1,
        fillColor: colors[idx],
        fillOpacity: 0.6
      };
    },
    onEachFeature: (feature, layer) => {
      const pc = feature.properties.postcode;
      const suburb = feature.properties.suburb || "N/A";
      const region = feature.properties.region || feature.properties.locality || "Unknown Area";

      layer.bindPopup(`<strong>Postcode:</strong> ${pc}<br/><strong>Suburb:</strong> ${suburb}<br/><strong>Region:</strong> ${region}`);
      layer.bindTooltip(`${suburb} (${pc})`, { permanent: false, direction: 'top' });

      layer.on({
        mouseover: (e) => {
          e.target.setStyle({ weight: 3, color: '#666', fillOpacity: 0.75 });
          e.target.bringToFront();
        },
        mouseout: (e) => postcodeLayer.resetStyle(e.target),
        click: (e) => {
          const idx = selectedPostcodes.indexOf(pc);
          if (idx !== -1) selectedPostcodes.splice(idx, 1);
          searchPostcodes(); // redraw
        }
      });
    }
  }).addTo(map);

  map.fitBounds(postcodeLayer.getBounds());

  selectedPostcodes.forEach((pc, i) => {
    legendHTML += `<div style="display:inline-block;width:20px;height:12px;background:${colors[i]};margin-right:6px;"></div> ${pc}<br/>`;
  });

  document.getElementById("legend").innerHTML = legendHTML;
}

function generateColors(n) {
  const base = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
  const colors = [];
  for (let i = 0; i < n; i++) colors.push(base[i % base.length]);
  return colors;
}

function downloadCSV() {
  if (selectedPostcodes.length === 0) {
    alert("No postcodes selected!");
    return;
  }
  const rows = selectedPostcodes.map(p => `"${p}"`);
  const blob = new Blob(["Postcode
" + rows.join("\n")], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "selected_postcodes.csv";
  a.click();
}
