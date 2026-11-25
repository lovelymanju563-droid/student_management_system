const GRADE_SCALE = [
  { minScore: 93, letter: 'A', points: 4.0 },
  { minScore: 90, letter: 'A-', points: 3.7 },
  { minScore: 87, letter: 'B+', points: 3.3 },
  { minScore: 83, letter: 'B', points: 3.0 },
  { minScore: 80, letter: 'B-', points: 2.7 },
  { minScore: 77, letter: 'C+', points: 2.3 },
  { minScore: 73, letter: 'C', points: 2.0 },
  { minScore: 70, letter: 'C-', points: 1.7 },
  { minScore: 67, letter: 'D+', points: 1.3 },
  { minScore: 60, letter: 'D', points: 1.0 },
  { minScore: 0, letter: 'F', points: 0.0 },
];

const LETTER_TO_POINTS = Object.fromEntries(
  GRADE_SCALE.map((entry) => [entry.letter, entry.points])
);

export const VALID_LETTER_GRADES = Object.keys(LETTER_TO_POINTS);

/**
 * Resolves a numeric score and/or letter grade into a normalized pair.
 * @param {{ score?: number, grade?: string }} input
 */
export function resolveGrade({ score, grade }) {
  if (typeof score === 'number') {
    const matched = GRADE_SCALE.find((entry) => score >= entry.minScore) || GRADE_SCALE.at(-1);
    const letter = grade ? grade.toUpperCase() : matched.letter;
    const points =
      letter in LETTER_TO_POINTS ? LETTER_TO_POINTS[letter] : matched.points;
    return {
      score: Number(score.toFixed(2)),
      grade: letter,
      gradePoints: points,
    };
  }

  if (typeof grade === 'string') {
    const normalized = grade.toUpperCase();
    if (!(normalized in LETTER_TO_POINTS)) {
      throw new Error(`Unsupported letter grade: ${grade}`);
    }
    return {
      score: null,
      grade: normalized,
      gradePoints: LETTER_TO_POINTS[normalized],
    };
  }

  throw new Error('Either score or grade must be provided');
}

/**
 * Calculates credit-weighted GPA (or unweighted average if credits missing).
 * @param {Array<{ gradePoints?: number | null, credits?: number }>} enrollments
 */
export function calculateGpa(enrollments) {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const item of enrollments) {
    if (typeof item.gradePoints !== 'number') continue;
    const credits = typeof item.credits === 'number' && item.credits > 0 ? item.credits : 3;
    totalPoints += item.gradePoints * credits;
    totalCredits += credits;
  }

  if (totalCredits === 0) return 0;
  return Number((totalPoints / totalCredits).toFixed(2));
}
