const headers = [
    "GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice date",
    "Invoice Value", "Place Of Supply", "Reverse Charge", "Applicable % of Tax Rate",
    "Invoice Type", "E-Commerce GSTIN", "Rate", "Taxable Value", "Cess Amount"
];

const stateMap = {
    "01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh","05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh","10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh","13":"Nagaland","14":"Manipur","15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam","19":"West Bengal","20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat","25":"Daman & Diu","26":"Dadra & Nagar Haveli","27":"Maharashtra","28":"Andhra Pradesh (Old)","29":"Karnataka","30":"Goa","31":"Lakshadweep","32":"Kerala","33":"Tamil Nadu","34":"Puducherry","35":"Andaman & Nicobar Islands","36":"Telangana","37":"Andhra Pradesh","38":"Ladakh"
};

// Render Header
const headerRow = document.getElementById("headerRow");
headers.forEach(h => {
    let th = document.createElement("th");
    th.innerText = h;
    headerRow.appendChild(th);
});
let actionTh = document.createElement("th");
actionTh.innerText = "Action";
headerRow.appendChild(actionTh);

function addRow(data = []) {
    const tbody = document.querySelector("#gstTable tbody");
    let tr = document.createElement("tr");

    headers.forEach((h, i) => {
        let td = document.createElement("td");
        let input = document.createElement("input");
        input.value = data[i] || "";
        input.addEventListener('input', () => validateRow(tr));
        // Blur event for auto-formatting date when user finishes typing
        if(i === 3) input.addEventListener('blur', () => validateRow(tr));
        td.appendChild(input);
        tr.appendChild(td);
    });

    let actionTd = document.createElement("td");
    actionTd.innerHTML = `<button class="btn-delete" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button>`;
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
    if(!data[8]) tr.cells[8].querySelector('input').value = "Regular";
    validateRow(tr);
}

// Date Formatting Logic
function formatDateValue(val) {
    if(!val) return val;
    // Replace dots or dashes with slashes
    let clean = val.replace(/[.\-]/g, '/');
    let parts = clean.split('/');
    
    if(parts.length === 3) {
        let d = parts[0].padStart(2, '0');
        let m = parts[1].padStart(2, '0');
        let y = parts[2];
        if(y.length === 2) y = "20" + y; // handle 26/01/26 -> 26/01/2026
        return `${d}/${m}/${y}`;
    }
    return val;
}

function validateRow(row) {
    let gstInput = row.cells[0].querySelector('input');
    let dateInput = row.cells[3].querySelector('input');
    
    let gst = gstInput.value.trim().toUpperCase();
    let date = dateInput.value.trim();

    // Apply Date Formatting
    if(date) {
        dateInput.value = formatDateValue(date);
    }

    row.classList.remove("row-invalid");

    // GST & State Validation
    if (gst.length > 0) {
        let stateCode = parseInt(gst.substring(0, 2));
        if (isNaN(stateCode) || stateCode < 1 || stateCode > 38 || gst.length !== 15) {
            row.classList.add("row-invalid");
        } else {
            let codeStr = gst.substring(0, 2);
            if (stateMap[codeStr]) {
                row.cells[5].querySelector('input').value = codeStr + "-" + stateMap[codeStr];
            }
        }
    }
    row.cells[8].querySelector('input').value = "Regular";
}

// GSTR-1 JSON Download
function downloadJSON() {
    let b2bData = {};
    document.querySelectorAll("#gstTable tbody tr").forEach(tr => {
        const ins = tr.querySelectorAll("input");
        let gstin = ins[0].value, invNo = ins[2].value;
        if(!gstin || !invNo) return;

        if (!b2bData[gstin]) b2bData[gstin] = { ctin: gstin, inv: [] };

        b2bData[gstin].inv.push({
            inum: invNo, 
            idt: ins[3].value, // This will be in DD/MM/YYYY
            val: parseFloat(ins[4].value) || 0,
            pos: ins[5].value.substring(0,2), 
            rchrg: ins[6].value || "N", 
            inv_typ: "R",
            itms: [{ num: 1, itm_det: { rt: parseFloat(ins[10].value) || 0, txval: parseFloat(ins[11].value) || 0, csamt: parseFloat(ins[12].value) || 0 } }]
        });
    });
    saveFile(JSON.stringify({ b2b: Object.values(b2bData) }, null, 2), "gstr1_export.json", "application/json");
}

function downloadCSV() {
    let rows = [headers];
    document.querySelectorAll("#gstTable tbody tr").forEach(tr => {
        rows.push(Array.from(tr.querySelectorAll("input")).map(i => i.value));
    });
    saveFile(rows.map(e => e.join(",")).join("\n"), "gst_data.csv", "text/csv");
}

function saveFile(content, fileName, type) {
    const blob = new Blob([content], { type: type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}

document.getElementById("fileInput").addEventListener("change", function(e) {
    const reader = new FileReader();
    reader.onload = (evt) => {
        const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
        json.slice(1).forEach(r => r.length && addRow(r));
    };
    reader.readAsArrayBuffer(e.target.files[0]);
});
