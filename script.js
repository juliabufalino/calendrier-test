
/* =========================================================
   CONFIGURATION FIREBASE : INCHANGÉE
   ========================================================= */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDp9uXc6cg87Ybn2cx0top4Vc9POyGr5RE",
  authDomain: "calendrier-af9c4.firebaseapp.com",
  projectId: "calendrier-af9c4",
  storageBucket: "calendrier-af9c4.firebasestorage.app",
  messagingSenderId: "1069386067244",
  appId: "1:1069386067244:web:bce96eab6f759b58d69089"
};

/* =========================================================
   PREMIER MOIS DE RÉFÉRENCE
   ========================================================= */

const START_MONTH = "2026-11";

/* =========================================================
   PERSONNES
   ========================================================= */

const PEOPLE = [
  {id:"personne1",name:"Yvette & Célestin",color:"#e4572e",hours:"14h-16h"},
  {id:"personne2",name:"Lucia",color:"#2f6fed"},
  {id:"personne3",name:"Edouard & Pina",color:"#16a34a"},
  {id:"personne4",name:"Rose",color:"#c026d3",hours:"13h-16h"},
  {id:"personne5",name:"Mario & Pina",color:"#d97706",hours:"10h30-12h"},
  {id:"personne6",name:"Claude & Jeanou",color:"#0891b2",hours:"10h-17h"},
  {id:"personne7",name:"Dominique",color:"#78350f",hours:"14h-16h"},
  {id:"personne8",name:"Jean-Claude",color:"#475569"},
  {id:"personne9",name:"Steve",color:"#4d7c0f"},
  {id:"personne10",name:"Antoinette",color:"#4338ca"},
  {id:"personne11",name:"Nino",color:"#881337",hours:"14h-17h sauf le mardi (⚠️Contacter Melina avant)"},
  {id:"personne12",name:"Nicole",color:"#ec4899"},
  {id:"personne13",name:"Rosa Fede",color:"#facc15"}
];

/* =========================================================
   VARIABLES
   ========================================================= */

let fb=null, uid=null, myName="", online=false, visits=[];
let view=new Date(), sel=null;
let showHistory=false, historyExpanded=null;

view=new Date(view.getFullYear(),view.getMonth(),1);

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const key=(y,m,d)=>y+"-"+pad(m+1)+"-"+pad(d);
const monthKey=(y,m)=>y+"-"+pad(m+1);

const has=(k,pid)=>visits.some(v=>v.date===k&&v.personId===pid);

function el(t,c,txt){
  const e=document.createElement(t);
  if(c)e.className=c;
  if(txt!=null)e.textContent=txt;
  return e;
}

function banner(t){$("banner").textContent=t}
function fail(){banner("Impossible d’enregistrer. Vérifie ta connexion internet et réessaie.")}

/* =========================================================
   BILANS
   ========================================================= */

function previousMonthKey(y,m){
  const d=new Date(y,m-1,1);
  return monthKey(d.getFullYear(),d.getMonth());
}

function monthLabel(k){
  const [y,m]=k.split("-").map(Number);
  return new Date(y,m-1,1).toLocaleDateString("fr-BE",{
    month:"long",year:"numeric"
  });
}

function monthStats(k){
  const prefix=k+"-";

  const done=PEOPLE.filter(p=>
    visits.some(v=>
      v.date&&v.date.startsWith(prefix)&&v.personId===p.id
    )
  );

  const missing=PEOPLE.filter(p=>
    !done.some(person=>person.id===p.id)
  );

  return {done,missing};
}

function priorityForPerson(pid){
  const current=monthKey(view.getFullYear(),view.getMonth());

  if(current<"2026-12")return false;

  const d=new Date(view.getFullYear(),view.getMonth()-1,1);
  const k=monthKey(d.getFullYear(),d.getMonth());

  if(k<START_MONTH)return false;

  return monthStats(k).missing.some(p=>p.id===pid);
}

/* =========================================================
   AFFICHAGE DU BILAN
   ========================================================= */

function renderSummary(){
  const current=monthKey(view.getFullYear(),view.getMonth());

  $("summary").hidden=current<="2026-11";

  if(current<="2026-11")return;

  const previous=previousMonthKey(view.getFullYear(),view.getMonth());
  const stats=monthStats(previous);

  $("summaryMonth").textContent=monthLabel(previous);

  const content=$("summaryContent");
  content.replaceChildren();

  const statsBox=el("div","summary-stats");

  const doneBox=el("div","summary-stat");
  doneBox.append(el("strong",null,stats.done.length));
  doneBox.append(el("span",null,"Visitées"));

  const missedBox=el("div","summary-stat missed");
  missedBox.append(el("strong",null,stats.missing.length));
  missedBox.append(el("span",null,"Non visitées"));

  statsBox.append(doneBox,missedBox);
  content.append(statsBox);

  if(stats.missing.length){
    content.append(el("p",null,"⚠️ Personnes à ne pas oublier :"));

    const list=el("div","summary-list");

    stats.missing.forEach(p=>{
      const line=el("div","summary-person");
      const dot=el("span","person-dot");
      dot.style.background=p.color;
      line.append(dot,el("span",null,p.name));
      list.append(line);
    });

    content.append(list);
  }else{
    content.append(el("p","summary-ok","✓ Toutes les personnes ont été visitées !"));
  }

  $("historyToggle").textContent=showHistory
    ?"Masquer les bilans précédents"
    :"Voir les bilans précédents";

  renderHistory();
}

/* =========================================================
   HISTORIQUE
   ========================================================= */

function renderHistory(){
  const box=$("historyContent");
  box.replaceChildren();
  box.hidden=!showHistory;

  if(!showHistory)return;

  const current=monthKey(view.getFullYear(),view.getMonth());
  const months=new Set();

  visits.forEach(v=>{
    if(v.date&&/^\d{4}-\d{2}-\d{2}$/.test(v.date)){
      const k=v.date.slice(0,7);
      if(k>=START_MONTH&&k<current)months.add(k);
    }
  });

  const ordered=[...months].sort().reverse();

  if(!ordered.length){
    box.append(el("p","hint","Aucun bilan antérieur disponible."));
    return;
  }

  const list=el("div","history-list");

  ordered.forEach(k=>{
    const stats=monthStats(k);
    const item=el("div","history-item");

    const button=el("button",null,
      (historyExpanded===k?"▼ ":"▶ ")+
      monthLabel(k)+" — "+stats.done.length+"/"+PEOPLE.length+" visitées"
    );

    button.style.cssText="width:100%;text-align:left;background:none;border:0;font:inherit;font-weight:800;padding:0";

    button.onclick=()=>{
      historyExpanded=historyExpanded===k?null:k;
      renderHistory();
    };

    item.append(button);

    if(historyExpanded===k){
      const details=el("div","summary-list");

      if(stats.missing.length){
        details.append(el("p",null,"Non visitées :"));

        stats.missing.forEach(p=>{
          const line=el("div","summary-person");
          const dot=el("span","person-dot");
          dot.style.background=p.color;
          line.append(dot,el("span",null,p.name));
          details.append(line);
        });
      }else{
        details.append(el("p","summary-ok","✓ Toutes les personnes ont été visitées."));
      }

      item.append(details);
    }

    list.append(item);
  });

  box.append(list);
}

/* =========================================================
   CALENDRIER
   ========================================================= */

function render(){
  const pre=view.getFullYear()+"-"+pad(view.getMonth()+1)+"-";

  $("mlabel").textContent=view.toLocaleDateString("fr-BE",{
    month:"long",year:"numeric"
  });

  const mv=visits.filter(v=>v.date&&v.date.startsWith(pre));

  const done=PEOPLE.filter(p=>mv.some(v=>v.personId===p.id)).length;

  $("stat").textContent=done+" sur "+PEOPLE.length+
    " personne"+(PEOPLE.length>1?"s":"")+" visitée"+(done>1?"s":"")+" ce mois-ci";

  renderSummary();

  const chips=$("chips");
  chips.replaceChildren();

  PEOPLE.forEach(p=>{
    const c=el("div","chip");
    c.style.background=p.color;

    c.append(el("span",null,
      (priorityForPerson(p.id)?"⚠️ ":"")+p.name
    ));

    if(p.hours)c.append(el("small",null,"🕒 "+p.hours));
    if(mv.some(v=>v.personId===p.id))c.append(el("small",null,"✓ visité"));

    chips.append(c);
  });

  const g=$("grid");
  g.replaceChildren();

  ["lun","mar","mer","jeu","ven","sam","dim"].forEach(w=>g.append(el("div","wd",w)));

  const y=view.getFullYear(),m=view.getMonth();
  const off=(new Date(y,m,1).getDay()+6)%7;
  const n=new Date(y,m+1,0).getDate();

  const t=new Date();
  const tk=key(t.getFullYear(),t.getMonth(),t.getDate());

  for(let i=0;i<off;i++)g.append(el("div","day off"));

  for(let d=1;d<=n;d++){
    const k=key(y,m,d);
    const b=el("button","day"+(k===tk?" today":"")+(k===sel?" sel":""));

    b.append(el("b",null,d));

    PEOPLE.filter(p=>has(k,p.id)).forEach(p=>{
      const tg=el("span","tag",p.name);
      tg.style.background=p.color;
      b.append(tg);
    });

    b.onclick=()=>{sel=k;render()};
    g.append(b);
  }

  renderSheet();
}

/* =========================================================
   FENÊTRE DES VISITES
   ========================================================= */

function renderSheet(){
  $("sheet").hidden=!sel;
  $("main").className=sel?"open":"";

  if(!sel)return;

  const [y,m,d]=sel.split("-").map(Number);

  $("sdate").textContent=new Date(y,m-1,d).toLocaleDateString("fr-BE",{
    weekday:"long",day:"numeric",month:"long"
  });

  const box=$("pbs");
  box.replaceChildren();

  PEOPLE.forEach(p=>{
    const on=has(sel,p.id);
    const other=on&&online&&!visits.some(v=>
      v.date===sel&&v.personId===p.id&&v.uid===uid
    );

    const who=visits.filter(v=>
      v.date===sel&&v.personId===p.id
    ).map(v=>v.by).filter(Boolean).join(", ");

    const urgent=priorityForPerson(p.id);

    const b=el("button","pb"+(on?" on":"")+(urgent&&!on?" priority":""),
      (on?"✓ ":"")+(urgent&&!on?"⚠️ ":"")+p.name+
      (on&&who?" · "+who:"")+
      (other&&!who?" (coché par un autre)":"")
    );

    b.style.borderColor=p.color;
    if(on)b.style.background=p.color;

    if(other){b.disabled=true;b.style.opacity=".6"}

    b.setAttribute("aria-pressed",on);
    b.onclick=()=>toggle(sel,p.id);
    box.append(b);
  });
}

/* =========================================================
   SAUVEGARDE LOCALE
   ========================================================= */

function localSave(){
  try{localStorage.setItem("visites",JSON.stringify(visits))}catch(e){}
}

/* =========================================================
   COCHER / DÉCOCHER
   ========================================================= */

async function toggle(k,pid){
  banner("");

  const found=visits.filter(v=>v.date===k&&v.personId===pid);

  try{
    if(online){
      if(!uid){
        banner("Connexion impossible : active l’authentification anonyme dans Firebase.");
        return;
      }

      if(found.length){
        const mine=found.filter(v=>v.uid===uid);

        if(!mine.length){
          banner("Cette visite a été cochée par "+(found[0].by||"quelqu’un d’autre")+" : seule cette personne peut l’annuler.");
          return;
        }

        await Promise.all(mine.map(v=>fb.deleteDoc(fb.doc(fb.db,"visits",v.id))));

      }else{
        if(!myName){
          banner("Écris d’abord ton prénom dans la case, au-dessus des noms.");
          $("myname").focus();
          return;
        }

        await fb.setDoc(fb.doc(fb.db,"visits",k+"_"+pid),{
          date:k,personId:pid,uid:uid,by:myName
        });
      }

    }else{
      if(found.length){
        visits=visits.filter(v=>!(v.date===k&&v.personId===pid));
      }else{
        if(!myName){
          banner("Écris d’abord ton prénom dans la case, au-dessus des noms.");
          $("myname").focus();
          return;
        }

        visits.push({id:k+"_"+pid,date:k,personId:pid,by:myName});
      }

      localSave();
      render();
    }

  }catch(_){
    fail();
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

$("sclose").onclick=()=>{sel=null;render()};

$("prev").onclick=()=>{
  view=new Date(view.getFullYear(),view.getMonth()-1,1);
  sel=null;
  showHistory=false;
  historyExpanded=null;
  render();
};

$("next").onclick=()=>{
  view=new Date(view.getFullYear(),view.getMonth()+1,1);
  sel=null;
  showHistory=false;
  historyExpanded=null;
  render();
};

$("historyToggle").onclick=()=>{
  showHistory=!showHistory;
  renderSummary();
};

/* =========================================================
   INITIALISATION FIREBASE
   ========================================================= */

async function init(){
  render();

  const nm=el("input");
  nm.id="myname";
  nm.placeholder="Ton prénom";
  nm.maxLength=30;
  nm.setAttribute("aria-label","Ton prénom");

  nm.style.cssText="width:100%;padding:10px 12px;margin:8px 0;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit";

  try{nm.value=localStorage.getItem("prenom")||""}catch(e){}

  myName=nm.value.trim();

  nm.oninput=()=>{
    myName=nm.value.trim();
    try{localStorage.setItem("prenom",myName)}catch(e){}
  };

  $("pbs").before(nm);

  if(FIREBASE_CONFIG.apiKey==="COLLE_ICI"){
    try{visits=JSON.parse(localStorage.getItem("visites")||"[]")}catch(e){visits=[]}
    banner("Mode test : les visites restent sur cet appareil.");
    render();
    return;
  }

  try{
    const B="https://www.gstatic.com/firebasejs/10.12.2/";

    const [app,st,au]=await Promise.all([
      import(B+"firebase-app.js"),
      import(B+"firebase-firestore.js"),
      import(B+"firebase-auth.js")
    ]);

    const a=app.initializeApp(FIREBASE_CONFIG);

    fb={
      db:st.getFirestore(a,"default"),
      doc:st.doc,
      setDoc:st.setDoc,
      deleteDoc:st.deleteDoc
    };

    try{
      const cred=await au.signInAnonymously(au.getAuth(a));
      uid=cred.user.uid;
      online=true;
    }catch(e){
      uid=null;
      online=false;
      banner("Connexion anonyme impossible : active-la dans Firebase Authentication.");
      return;
    }

    st.onSnapshot(
      st.collection(fb.db,"visits"),
      s=>{
        visits=s.docs.map(d=>Object.assign({id:d.id},d.data()));
        banner("");
        render();
      },
      ()=>{
        banner("Impossible de lire les visites. Vérifie les règles Firestore.");
      }
    );

  }catch(e){
    console.error(e);
    banner("Connexion impossible. Vérifie ta connexion internet.");
  }
}

init();
