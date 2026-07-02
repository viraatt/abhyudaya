export const club = {
  name: 'Abhyudaya',
  fullName: 'Abhyudaya Club',
  institute: 'Maharana Pratap Engineering College (MPEC), Kanpur',
  department: 'Department of Basic Sciences & Humanities',
  tagline: 'Curiosity to Creation.',
  meaning:
    '"Abhyudaya" is a Sanskrit word meaning rise, ascent, and prosperity — a fitting name for a club built on the idea that every idea, like every flight, begins on the ground.',
}

export const socials = {
  instagram: 'https://www.instagram.com/abhyudaya_official/',
  linkedin: 'https://www.linkedin.com/company/abhyudayaclubmpec/posts/?feedView=all',
  email: 'abhyudayaclubmpec@gmail.com',
}

export const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Events', to: '/events' },
  { label: 'Team', to: '/team' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
]

// Events drawn from the club's public activity, including the TechBloom 2.0
// fest lineup. Descriptions are written to match each event's name and
// format — replace with exact rules/dates as the club finalizes them.
export const events = [
  {
    slug: 'techbloom-2',
    name: 'TechBloom 2.0',
    kind: 'Flagship Fest',
    summary:
      'The club\u2019s flagship annual technical fest, bringing speaker sessions, competitions, and hands-on workshops together under one roof.',
    detail:
      'Organized under the Department of Basic Sciences & Humanities, TechBloom 2.0 combined inspiring talks with a full slate of competitions and workshops, closing with a live aircraft flying session on the lawns.',
    featured: true,
    subEvents: [
      {
        slug: 'quiztronix',
        name: 'Quiztronix',
        kind: 'Quiz',
        summary: 'A fast-paced technical quiz that tests breadth of knowledge across science and engineering.',
        detail:
          'Teams race through rounds covering electronics, computing, and general technical awareness, with elimination rounds building to a high-stakes finale.',
      },
      {
        slug: 'poster-verse',
        name: 'Poster Verse',
        kind: 'Design Competition',
        summary: 'A poster-making competition where participants visualize a technical or social theme.',
        detail:
          'Entrants design and present original posters on a themed prompt, judged on concept, clarity, and visual execution.',
      },
      {
        slug: 'tech-trolls',
        name: 'Tech-Trolls',
        kind: 'Fun Tech Challenge',
        summary: 'A light-hearted, high-energy tech challenge built around quick thinking under pressure.',
        detail:
          'A rapid-round format that mixes technical trivia with on-the-spot problem solving, kept fast and fun for every skill level.',
      },
      {
        slug: 'trail-blaze',
        name: 'Trail Blaze',
        kind: 'Treasure Hunt',
        summary: 'A campus-wide trail hunt that turns clues and puzzles into a race across MPEC.',
        detail:
          'Teams follow a chain of technical and lateral-thinking clues across campus, with the fastest correct trail taking the win.',
      },
      {
        slug: 'nextgen-ventures',
        name: 'NextGen Ventures',
        kind: 'Pitch Competition',
        summary: 'An entrepreneurship-style pitch event for early-stage ideas and student ventures.',
        detail:
          'Students pitch original venture ideas to a panel, practicing the same structure and scrutiny used in real startup pitch rooms.',
      },
    ],
  },
  {
    slug: 'aeromodelling-workshop',
    name: 'Aeromodelling & RC Aircraft Design Workshop',
    kind: 'Workshop',
    summary:
      'A hands-on session on designing and building RC aircraft, ending with a live flying demonstration.',
    detail:
      'Participants built their own aircraft models from the ground up, then took them outdoors for a live flying session — the standout moment of TechBloom 2.0.',
  },
  {
    slug: 'website-dev-workshop',
    name: 'Website Development Workshop',
    kind: 'Workshop',
    summary: 'A practical, build-along session covering the fundamentals of building a website.',
    detail:
      'A guided, hands-on workshop that takes participants from a blank page to a working site, focused on skills they can keep using after the event ends.',
  },
]
// Placeholder roster — swap in real names, photos, and socials for the
// club's current core team and faculty coordinator.
export const team = {
  faculty: [
    {
      name: "Dr. Anupama Mathur",
      role: "Faculty Advisor",
      image: "https://www.image2url.com/r2/default/images/1782925455771-fcabd88a-9d76-44aa-8731-ebbb72274fd0.jpeg",
      linkedin: "https://www.linkedin.com/in/anupama-mathur-426578263/",
    },
  ],

  core: [
    {
      name: "N/A",
      role: "President",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "",
    },
    {
      name: "N/A",
      role: "Vice President",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "",
    },
    {
      name: "Unnati Pal",
      role: "General Secretary",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/unnatii05/",
    },
    {
      name: "Ishan Shukla",
      role: "Operations Lead",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/ishanshukla2/",
    },
    {
      name: "Virat Mishra",
      role: "Technical Lead",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/viratmishra24/",
    },
    {
      name: "Sharad Agnihotri",
      role: "PR Lead",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/sharad-agnihotri-628938315/",
    },
    {
      name: "Tilak Rajawat",
      role: "Core Member",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/tilakraj-singh-rajawat-121y/",
    },
    {
      name: "Kuldeep Yadav",
      role: "Core Member",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/kuldeep-yadav-cse28/",
    },
    {
      name: "Shashwat Singh",
      role: "Core Member",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "linkedin.com/in/shashwat-singh-8a5784362/?skipRedirect=true",
    },
    {
      name: "Arpit Singh",
      role: "Core Member",
      image: "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/arpit-singh-1004a8327/?skipRedirect=true",
    },
  ],
};
