import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'nclex.db');
const db = new DatabaseSync(DB_PATH);

const highYieldCards = [
  {
    deck_id: 1,
    user_id: 2,
    question_id: 103,
    front: 'Thyroid Storm (Thyrotoxic Crisis) — Priority Beta-Blocker & Salicylate Hazard',
    back: 'Propranolol is administered immediately to block beta-1 adrenergic cardiac effects and peripheral conversion of T4 to T3. Salicylates (Aspirin) are STRICTLY CONTRAINDICATED because they displace thyroid hormones from binding prealbumin, dramatically spiking free T3/T4 levels!',
    clinical_pearl: 'Thyroid Storm: Give Propranolol. NEVER give Aspirin (use Acetaminophen for hyperthermia).',
    box_level: 1,
    interval_days: 1,
    ease_factor: 2.50
  },
  {
    deck_id: 1,
    user_id: 2,
    question_id: 104,
    front: 'Tetralogy of Fallot — Acute Hypercyanotic "Tet Spell" Immediate Nursing Action',
    back: 'Place the infant immediately in the Knee-Chest position. This increases systemic vascular resistance (SVR), diverting deoxygenated blood away from the ventricular septal defect (VSD) into the pulmonary artery for oxygenation. Administer oxygen and morphine.',
    clinical_pearl: 'Hypercyanotic Tet Spell = Knee-to-Chest position first! Increases systemic afterload.',
    box_level: 2,
    interval_days: 3,
    ease_factor: 2.60
  },
  {
    deck_id: 1,
    user_id: 2,
    question_id: 106,
    front: 'Heparin-Induced Antidote & aPTT Monitoring Standards',
    back: 'Protamine Sulfate is the direct chemical antagonist for unfractionated heparin. Therapeutic aPTT is 1.5 to 2.5 times the control baseline (approx. 45-75 seconds). aPTT > 100 seconds indicates severe hemorrhage risk.',
    clinical_pearl: 'Heparin antidote = Protamine Sulfate. Warfarin antidote = Vitamin K (Phytonadione).',
    box_level: 3,
    interval_days: 7,
    ease_factor: 2.55
  },
  {
    deck_id: 1,
    user_id: 2,
    question_id: 154,
    front: 'Lithium Toxicity — Therapeutic Window & Toxic Manifestations',
    back: 'Therapeutic maintenance level: 0.6 to 1.2 mEq/L. Levels > 1.5 mEq/L cause acute toxicity: coarse hand tremors, persistent nausea/vomiting, ataxia, confusion, and polyuria. Dehydration and low-sodium diets trigger dangerous lithium retention.',
    clinical_pearl: 'Lithium = 0.6-1.2 mEq/L. Low sodium = High Lithium toxicity risk!',
    box_level: 4,
    interval_days: 14,
    ease_factor: 2.70
  },
  {
    deck_id: 1,
    user_id: 2,
    question_id: 159,
    front: 'Neuroleptic Malignant Syndrome (NMS) vs Serotonin Syndrome Key Distinctions',
    back: 'NMS (caused by antipsychotics like Haloperidol) presents with "Lead-pipe" muscle rigidity, severe hyperthermia (> 104°F / 40°C), autonomic instability, and elevated CPK. Serotonin Syndrome presents with hyperreflexia, clonus, and tremor. NMS is treated with Dantrolene and Bromocriptine.',
    clinical_pearl: 'NMS = Antipsychotics, Lead-Pipe Rigidity, High CPK, Treat with Dantrolene. Serotonin Syndrome = SSRIs, Hyperreflexia, Clonus.',
    box_level: 5,
    interval_days: 30,
    ease_factor: 2.80
  },
  {
    deck_id: 1,
    user_id: 2,
    question_id: 150,
    front: 'Postpartum Uterine Atony — Distended Bladder & Boggy Fundus Priority Action',
    back: 'A fundus displaced above the umbilicus and deviated to the right indicates urinary bladder distension. Priority action is to assist the client to void or catheterize, then firmly massage the fundus until firm.',
    clinical_pearl: 'Fundus up and to the right = Full bladder! Empty bladder before aggressive uterotonics.',
    box_level: 3,
    interval_days: 7,
    ease_factor: 2.50
  },
  {
    deck_id: 1,
    user_id: 2,
    question_id: 152,
    front: 'Fetal Heart Rate Late Decelerations — Intrauterine Resuscitation Protocol',
    back: 'Late decelerations indicate uteroplacental insufficiency. Immediate interventions: 1. Turn client to Left Lateral side. 2. Stop IV Oxytocin (Pitocin). 3. Administer 8-10 L/min Oxygen via tight face mask. 4. Bolus IV non-additive crystalloids (Lactated Ringer).',
    clinical_pearl: 'Late decels = Uteroplacental insufficiency. Turn Left, Stop Pitocin, Give Oxygen, Bolus fluids.',
    box_level: 2,
    interval_days: 3,
    ease_factor: 2.65
  }
];

const insert = db.prepare(`
  INSERT INTO flashcards (
    deck_id, user_id, question_id, front, back, clinical_pearl,
    box_level, interval_days, ease_factor, repetition_count, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
`);

let inserted = 0;
for (const c of highYieldCards) {
  const existing = db.prepare('SELECT id FROM flashcards WHERE front = ?').get(c.front);
  if (!existing) {
    insert.run(c.deck_id, c.user_id, c.question_id, c.front, c.back, c.clinical_pearl, c.box_level, c.interval_days, c.ease_factor);
    inserted++;
  }
}

db.prepare('UPDATE flashcard_decks SET card_count = (SELECT COUNT(*) FROM flashcards WHERE deck_id = flashcard_decks.id)').run();

console.log('Seeded flashcards. New:', inserted, 'Total in DB:', db.prepare('SELECT COUNT(*) as count FROM flashcards').get().count);
db.close();
