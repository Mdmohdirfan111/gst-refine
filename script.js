// Headers (as per your original + common GSTR-1 B2B fields)
const headers = [
    "GSTIN/UIN of Recipient",
    "Receiver Name",
    "Invoice Number",
    "Invoice date",
    "Invoice Value",
    "Place Of Supply",
    "Reverse Charge",
    "Applicable % of Tax Rate",
    "Invoice Type",
    "E-Commerce GSTIN",
    "Rate",
    "Taxable Value",
    "Cess Amount"
];

// Valid state codes 01–38 (including Ladakh)
const validStateCodes = Array.from({length: 38}, (_, i) => String(i+1).padStart(2,'0'));

const stateMap = {
    "01":"Jammu & Kashmir", "02":"Himachal Pradesh", "03":"Punjab", "04":"Chandigarh",
    "05":"Uttarakhand", "06":"Haryana", "07":"Delhi", "08":"Rajasthan",
    "09":"Uttar Pradesh", "10":"Bihar", "11":"Sikkim", "12":"Arunachal Pradesh",
    "13":"Nagaland", "14":"Manipur", "15":"Mizoram", "16":"Tripura",
    "17":"Meghalaya", "18":"Assam", "19":"West Bengal", "20":"Jharkhand",
    "21":"Odisha", "22":"Chhattisgarh", "23":"Madhya Pradesh", "24":"Gujarat",
    "25":"Daman & Diu", "26":"Dadra & Nagar Haveli", "27":"Maharashtra",
    "28":"Andhra Pradesh (Old)", "29":"Karnataka", "30":"Goa", "31":"Lakshadweep",
    "32":"Kerala", "33":"Tamil Nadu", "34":"Puducherry", "35":"Andaman & Nicobar Islands",
    "36":"Telangana", "37":"Andhra Pradesh", "38":"Ladakh"
};

// Render headers
document.getElementById("headerRow").innerHTML = headers.map(h => `<th>${h}</th>`).join('');

// Add row function
function addRow(data = Array(headers.length).fill("")) {
    const tbody = document.querySelector("#gstTable tbody");
    const tr = document.createElement("tr");

    headers.forEach((_, i) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.value = data[i] || "";
        input.oninput = () => validateAndUpdate(tr);
        td.appendChild(input);
        tr.appendChild(td);
    });

    // Force "Regular" for Invoice Type (most common in GSTR-1 B2B)
    tr.cells[8].querySelector("input").value = "Regular";

    tbody.appendChild(tr);
    validateAndUpdate(tr);
    updateRowCount();
}

// Check if row is completely empty
function isEmptyRow(data) {
    return data.every(v => !v || String(v).trim() === "");
}

// Main validation
function validateAndUpdate(row) {
    const inputs = row.querySelectorAll("input");
    const gst = inputs[0].value.trim().toUpperCase();
    const pos = inputs[5].value.trim();
    const dateInput = inputs[3];

    let invalid = false;

    // GSTIN validation - 15 chars + starts with 01-38
    if (gst.length === 15) {
        const stateCode = gst.substring(0,2);
        if (validStateCodes.includes(stateCode)) {
            // Auto-fill Place of Supply if empty or mismatched
            if (!pos || pos.startsWith(stateCode)) {
                inputs[5].value = `${stateCode}-${stateMap[stateCode] || "Unknown"}`;
            }
        } else {
            invalid = true;
        }
    } else if (gst !== "") {
        invalid = true;
    }

    // Strict state code check in POS (if manually edited)
    if (pos) {
        const codeMatch = pos.match(/^(\d{2})/);
        if (codeMatch && !validStateCodes.includes(codeMatch[1])) {
            invalid = true;
        }
    }

    // Date formatting (DD-MM-YYYY)
    let dateVal = dateInput.value.trim();
    if (dateVal) {
        dateVal = dateVal.replace(/[-.\/]/g, '/');
        const parts = dateVal.split('/');
        if (parts.length === 3) {
            let [d,m,y] = parts;
            if (y.length === 2) y = '20' + y;
            d = d.padStart(2,'0');
            m = m.padStart(2,'0');
            dateInput.value = `${d}-${m}-${y}`;
        }
    }

    // Force Regular
    inputs[8].value = "Regular";

    row.classList.toggle("invalid", invalid);
    updateRowCount();
}

function updateRowCount() {
    const count = document.querySelectorAll("#gstTable tbody tr").length;
    document.getElementById("rowCount").textContent = `${count} rows`;
}

// File upload
document.getElementById("fileInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, {header: 1, blankrows: false});

            if (JSON.stringify(json[0]) !== JSON.stringify(headers)) {
                alert("Header row doesn't match expected GST template!\nPlease use correct format.");
                return;
            }

            json.slice(1).forEach(row => {
                if (!isEmptyRow(row)) {
                    addRow(row);
                }
            });
        } catch(err) {
            alert("Error reading file: " + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
});

// CSV Export
function downloadCSV() {
    const rows = [headers];
    document.querySelectorAll("#gstTable tbody tr").forEach(tr => {
        const row = Array.from(tr.querySelectorAll("input")).map(i => i.value);
        rows.push(row);
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GST_Data_" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
}

// GSTR-1 JSON Export (B2B section like format)
function downloadGSTR1JSON() {
    const data = [];

    document.querySelectorAll("#gstTable tbody tr").forEach(tr => {
        const inputs = tr.querySelectorAll("input");
        const obj = {};

        headers.forEach((key, i) => {
            let val = inputs[i].value.trim();
            if (key === "Invoice date" && val) {
                // GSTR-1 usually expects DD-MM-YYYY
                obj[key] = val;
            } else if (["Invoice Value", "Rate", "Taxable Value", "Cess Amount"].includes(key)) {
                obj[key] = val ? Number(val) : 0;
            } else {
                obj[key] = val;
            }
        });

        // Minimal GSTR-1 B2B like structure
        data.push({
            gstin: obj["GSTIN/UIN of Recipient"],
            receiver_name: obj["Receiver Name"],
            invoice_no: obj["Invoice Number"],
            invoice_date: obj["Invoice date"],
            invoice_value: obj["Invoice Value"],
            place_of_supply: obj["Place Of Supply"],
            reverse_charge: obj["Reverse Charge"] || "N",
            tax_rate_percentage: obj["Applicable % of Tax Rate"],
            invoice_type: obj["Invoice Type"],
            ecom_gstin: obj["E-Commerce GSTIN"],
            rate: obj["Rate"],
            taxable_value: obj["Taxable Value"],
            cess_amount: obj["Cess Amount"]
        });
    });

    const jsonStr = JSON.stringify({ b2b: data }, null, 2);
    const blob = new Blob([jsonStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GSTR1_B2B_" + new Date().toISOString().slice(0,10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
}

// Start with one empty row
addRow();
