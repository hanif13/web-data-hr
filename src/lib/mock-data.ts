export interface Person {
  id: number;
  pageId?: string;
  fname: string;
  lname: string;
  phone?: string;
  email?: string;
  fb?: string;
  fbName?: string;
  line?: string;
  job?: string;
  province?: string;
  group: string;
  edu?: string;
  gen?: string;
  note?: string;
  photo?: string;
  skills?: string[];
}

export interface NavSection {
  label: string;
  ids: string[];
}

export interface PageConfig {
  id: string;
  label: string;
  color: string;
  bg: string;
  groups: string[];
  groupLabel: string;
  showGen: boolean;
}

export const PAGES: PageConfig[] = [
  {
    id: 'branch',
    label: 'บุคลากรสาขา',
    color: '#185FA5',
    bg: '#E6F1FB',
    groups: ['กรุงเทพ', 'นครศรีธรรมราช', 'สตูล', 'ภูเก็ต', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส'],
    groupLabel: 'สาขา',
    showGen: false
  },
  {
    id: 'fityah_n',
    label: 'ทำเนียบน้องค่ายฟิตยะตุลฮัก',
    color: '#0F6E56',
    bg: '#E1F5EE',
    groups: ['รุ่นที่ 1', 'รุ่นที่ 2', 'รุ่นที่ 3', 'รุ่นที่ 4', 'รุ่นที่ 5'],
    groupLabel: 'รุ่น',
    showGen: true
  },
  {
    id: 'fityah_p',
    label: 'ทำเนียบพี่ค่ายฟิตยะตุลฮัก',
    color: '#0F6E56',
    bg: '#E1F5EE',
    groups: ['รุ่นที่ 1', 'รุ่นที่ 2', 'รุ่นที่ 3', 'รุ่นที่ 4', 'รุ่นที่ 5'],
    groupLabel: 'รุ่น',
    showGen: true
  },
  {
    id: 'robbani_n',
    label: 'ทำเนียบน้องค่ายร็อบบานีย์',
    color: '#533AB7',
    bg: '#EEEDFE',
    groups: ['รุ่นที่ 1', 'รุ่นที่ 2', 'รุ่นที่ 3', 'รุ่นที่ 4', 'รุ่นที่ 5'],
    groupLabel: 'รุ่น',
    showGen: true
  },
  {
    id: 'robbani_p',
    label: 'ทำเนียบพี่ค่ายร็อบบานีย์',
    color: '#534AB7',
    bg: '#EEEDFE',
    groups: ['รุ่นที่ 1', 'รุ่นที่ 2', 'รุ่นที่ 3', 'รุ่นที่ 4', 'รุ่นที่ 5'],
    groupLabel: 'รุ่น',
    showGen: true
  },
  {
    id: 'standup_n',
    label: 'ทำเนียบน้องค่ายสแตนอัพ',
    color: '#854F0B',
    bg: '#FAEEDA',
    groups: ['รุ่นที่ 1', 'รุ่นที่ 2', 'รุ่นที่ 3', 'รุ่นที่ 4', 'รุ่นที่ 5'],
    groupLabel: 'รุ่น',
    showGen: true
  },
  {
    id: 'standup_p',
    label: 'ทำเนียบพี่ค่ายสแตนอัพ',
    color: '#854F0B',
    bg: '#FAEEDA',
    groups: ['รุ่นที่ 1', 'รุ่นที่ 2', 'รุ่นที่ 3', 'รุ่นที่ 4', 'รุ่นที่ 5'],
    groupLabel: 'รุ่น',
    showGen: true
  },
];

export const NAV_GROUPS: NavSection[] = [
  { label: 'หลัก', ids: ['branch'] },
  { label: 'ค่ายฟิตยะตุลฮัก', ids: ['fityah_n', 'fityah_p'] },
  { label: 'ค่ายร็อบบานีย์', ids: ['robbani_n', 'robbani_p'] },
  { label: 'ค่ายสแตนอัพ', ids: ['standup_n', 'standup_p'] },
];

export const MOCK_DATA: Record<string, Person[]> = {
  branch: [],
  fityah_n: [],
  fityah_p: [],
  robbani_n: [],
  robbani_p: [],
  standup_n: [],
  standup_p: []
};
