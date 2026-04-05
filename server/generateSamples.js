const fs = require("fs");
const path = require("path");

// ── Hiring dataset (500 rows) — gender + race bias ──
function generateHiring() {
  const rows = [
    "candidate_id,gender,race,age,education_level,years_experience,skills_score,hired",
  ];
  const genders = ["Male", "Female"];
  const races = ["White", "Black", "Hispanic", "Asian"];
  const educations = ["Tier1", "Tier2", "Tier3"];

  for (let i = 1; i <= 500; i++) {
    const gender = genders[Math.random() < 0.5 ? 0 : 1];
    const race = races[Math.floor(Math.random() * 4)];
    const age = Math.floor(Math.random() * 25) + 22;
    const edu = educations[Math.floor(Math.random() * 3)];
    const exp = Math.floor(Math.random() * 12);
    const skills = Math.floor(Math.random() * 40) + 60;

    // Bias: Males hired at 65%, Females at 38%
    // White/Asian hired more than Black/Hispanic
    let hireProbability = 0.5;
    if (gender === "Male") hireProbability += 0.15;
    else hireProbability -= 0.12;
    if (race === "White") hireProbability += 0.1;
    else if (race === "Asian") hireProbability += 0.05;
    else if (race === "Black") hireProbability -= 0.1;
    else if (race === "Hispanic") hireProbability -= 0.08;

    const hired = Math.random() < hireProbability ? 1 : 0;
    rows.push(`${i},${gender},${race},${age},${edu},${exp},${skills},${hired}`);
  }
  return rows.join("\n");
}

// ── Loan dataset (800 rows) — gender + race bias ──
function generateLoan() {
  const rows = [
    "applicant_id,gender,race,age,income,credit_score,loan_amount,loan_approved",
  ];
  const genders = ["Male", "Female"];
  const races = ["White", "Black", "Hispanic", "Asian"];

  for (let i = 1; i <= 800; i++) {
    const gender = genders[Math.random() < 0.5 ? 0 : 1];
    const race = races[Math.floor(Math.random() * 4)];
    const age = Math.floor(Math.random() * 40) + 22;
    const income = Math.floor(Math.random() * 80000) + 30000;
    const credit = Math.floor(Math.random() * 200) + 580;
    const amount = Math.floor(Math.random() * 400000) + 50000;

    // Bias: Males approved at 68%, Females at 45%
    // White approved more
    let prob = 0.55;
    if (gender === "Male") prob += 0.13;
    else prob -= 0.1;
    if (race === "White") prob += 0.12;
    else if (race === "Asian") prob += 0.06;
    else if (race === "Black") prob -= 0.12;
    else if (race === "Hispanic") prob -= 0.09;

    const approved = Math.random() < prob ? 1 : 0;
    rows.push(
      `${i},${gender},${race},${age},${income},${credit},${amount},${approved}`,
    );
  }
  return rows.join("\n");
}

// ── Medical dataset (600 rows) — race + age_group bias ──
function generateMedical() {
  const rows = [
    "patient_id,gender,race,age_group,insurance_type,condition_severity,treatment_approved",
  ];
  const races = ["White", "Black", "Hispanic", "Asian"];
  const ageGroups = ["Young", "Adult", "Senior"];
  const insurances = ["Private", "Public", "None"];
  const severities = ["Low", "Moderate", "High"];

  for (let i = 1; i <= 600; i++) {
    const gender = Math.random() < 0.5 ? "Male" : "Female";
    const race = races[Math.floor(Math.random() * 4)];
    const ageGroup = ageGroups[Math.floor(Math.random() * 3)];
    const insurance = insurances[Math.floor(Math.random() * 3)];
    const severity = severities[Math.floor(Math.random() * 3)];

    // Bias: White patients approved at 72%, Black at 41%
    // Seniors approved less
    let prob = 0.55;
    if (race === "White") prob += 0.17;
    else if (race === "Asian") prob += 0.08;
    else if (race === "Black") prob -= 0.14;
    else if (race === "Hispanic") prob -= 0.1;
    if (ageGroup === "Senior") prob -= 0.08;
    else if (ageGroup === "Young") prob += 0.05;
    if (insurance === "None") prob -= 0.15;
    else if (insurance === "Private") prob += 0.08;

    const approved = Math.random() < prob ? 1 : 0;
    rows.push(
      `${i},${gender},${race},${ageGroup},${insurance},${severity},${approved}`,
    );
  }
  return rows.join("\n");
}

// Write files
const dir = path.join(__dirname, "samples");
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, "hiring_dataset.csv"), generateHiring());
fs.writeFileSync(path.join(dir, "loan_dataset.csv"), generateLoan());
fs.writeFileSync(path.join(dir, "medical_dataset.csv"), generateMedical());

console.log("✅ Sample datasets generated:");
console.log("   hiring_dataset.csv — 500 rows");
console.log("   loan_dataset.csv   — 800 rows");
console.log("   medical_dataset.csv — 600 rows");
