export interface RubricPoint {
  key: string;
  text: string;
}

export interface RubricLaw {
  number: number;
  title: string;
  points: RubricPoint[];
}

export const RUBRIC: RubricLaw[] = [
  {
    number: 1,
    title: "The Law of the Teacher",
    points: [
      { key: "1-1", text: "The teacher is acting like a Raggant." },
      { key: "1-2", text: "The teacher demonstrates mastery of the subject." },
      { key: "1-3", text: "The lesson material appears fresh in the teacher's mind." },
      { key: "1-4", text: "The teacher has clear learning objectives." },
      { key: "1-5", text: "The teacher employs a variety of teaching methods as necessary." },
    ],
  },
  {
    number: 2,
    title: "The Law of the Learner",
    points: [
      { key: "2-1", text: "The teacher secures and retains the students' attention." },
      { key: "2-2", text: "The teacher demonstrates high behavioral standards for the students." },
      { key: "2-3", text: "The teacher holds the students accountable." },
    ],
  },
  {
    number: 3,
    title: "The Law of Teaching",
    points: [
      { key: "3-1", text: "The teacher uses simple language to communicate lesson concepts." },
      { key: "3-2", text: "The teacher ensures students understand his language before proceeding." },
    ],
  },
  {
    number: 4,
    title: "The Law of the Lesson",
    points: [
      { key: "4-1", text: "The teacher makes use of review to frame the lesson." },
      { key: "4-2", text: "The teacher encourages students to draw on personal experience." },
    ],
  },
  {
    number: 5,
    title: "The Law of the Teaching Process",
    points: [
      { key: "5-1", text: "The teacher does less speaking than the students." },
      { key: "5-2", text: "The teacher asks provocative questions and provides sufficient time to answer." },
      { key: "5-3", text: "The teacher encourages and coaches the students to ask questions." },
    ],
  },
  {
    number: 6,
    title: "The Law of the Learning Process",
    points: [
      { key: "6-1", text: "The teacher offers clear objectives for the lesson." },
      { key: "6-2", text: "The teacher employs at least one type of informal assessment." },
      { key: "6-3", text: "The teacher communicates that truth should be the student's pursuit." },
    ],
  },
  {
    number: 7,
    title: "The Law of Review",
    points: [
      { key: "7-1", text: "The teacher opens the lesson with review." },
      { key: "7-2", text: "The teacher employs review throughout the rest of the lesson." },
      { key: "7-3", text: "The teacher reviews with method appropriate for the students' learning level." },
      { key: "7-4", text: "The teacher finishes the lesson deliberately." },
    ],
  },
];

export const ALL_POINT_KEYS = RUBRIC.flatMap(l => l.points.map(p => p.key));
export const TOTAL_POINTS = ALL_POINT_KEYS.length; // 22
