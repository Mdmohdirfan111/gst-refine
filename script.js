const headers=[
"GSTIN/UIN of Recipient","Receiver Name","Invoice Number","Invoice date",
"Invoice Value","Place Of Supply","Reverse Charge",
"Applicable % of Tax Rate","Invoice Type","E-Commerce GSTIN",
"Rate","Taxable Value","Cess Amount"
];

const stateMap={
"01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh",
"05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan",
"09":"Uttar Pradesh","10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh",
"13":"Nagaland","14":"Manipur","15":"Mizoram","16":"Tripura",
"17":"Meghalaya","18":"Assam","19":"West Bengal","20":"Jharkhand",
"21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat",
"25":"Daman & Diu","26":"Dadra & Nagar Haveli","27":"Maharashtra",
"28":"Andhra Pradesh (Old)","29":"Karnataka","30":"Goa","31":"Lakshadweep",
"32":"Kerala","33":"Tamil Nadu","34":"Puducherry","35":"Andaman & Nicobar Islands",
"36":"Telangana","37":"Andhra Pradesh","38":"Ladakh"
};

const headerRow=document.getElementById("headerRow");
headers.forEach(h=>{
    let th=document.createElement("th");
    th.innerText=h;
    headerRow.appendChild(th);
});

function addRow(data=[]){
    if(isEmptyRow(data)) return; // auto delete empty row

    const tbody=document.querySelector("#gstTable tbody");
    let tr=document.createElement("tr");

    headers.forEach((h,i)=>{
        let td=document.createElement("td");
        let input=document.createElement("input");
        input.value=data[i]||"";
        input.onchange=()=>validateRow(tr);
        td.appendChild(input);
        tr.appendChild(td);
    });

    tbody.appendChild(tr);
    tr.cells[8].children[0].value="Regular";
}

function isEmptyRow(row){
    if(!row) return true;
    return row.every(cell=>!cell || cell.toString().trim()==="");
}

function validateRow(row){
    let gst=row.cells[0].children[0].value.trim();
    let date=row.cells[3].children[0].value.trim();

    row.classList.remove("invalid");

    if(gst.length!==15 || isNaN(gst.substring(0,2))){
        row.classList.add("invalid");
    }else{
        let code=gst.substring(0,2);
        if(stateMap[code]){
            row.cells[5].children[0].value=stateMap[code];
        }
    }

    if(date){
        let d=new Date(date.replace(/[\.\-\/]/g,"/"));
        if(!isNaN(d)){
            let day=("0"+d.getDate()).slice(-2);
            let month=("0"+(d.getMonth()+1)).slice(-2);
            let year=d.getFullYear();
            row.cells[3].children[0].value=`${day}-${month}-${year}`;
        }
    }

    row.cells[8].children[0].value="Regular";
}

document.getElementById("fileInput").addEventListener("change",function(e){
    const file=e.target.files[0];
    const reader=new FileReader();
    reader.onload=function(evt){
        const data=new Uint8Array(evt.target.result);
        const workbook=XLSX.read(data,{type:'array'});
        const sheet=workbook.Sheets[workbook.SheetNames[0]];
        const json=XLSX.utils.sheet_to_json(sheet,{header:1});

        if(JSON.stringify(json[0])!==JSON.stringify(headers)){
            alert("Header mismatch!");
            return;
        }

        json.slice(1).forEach(r=>{
            if(!isEmptyRow(r)) addRow(r);
        });
    };
    reader.readAsArrayBuffer(file);
});

function downloadCSV(){
    let rows=[headers];
    document.querySelectorAll("#gstTable tbody tr").forEach(tr=>{
        let row=[];
        tr.querySelectorAll("input").forEach(inp=>row.push(inp.value));
        rows.push(row);
    });

    let csv=rows.map(r=>r.join(",")).join("\n");
    let blob=new Blob([csv],{type:"text/csv"});
    let link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download="gst_data.csv";
    link.click();
}

function downloadJSON(){
    let data=[];
    document.querySelectorAll("#gstTable tbody tr").forEach(tr=>{
        let obj={};
        tr.querySelectorAll("input").forEach((inp,i)=>{
            obj[headers[i]]=inp.value;
        });
        data.push(obj);
    });

    let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    let link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download="gst_data.json";
    link.click();
}

addRow();