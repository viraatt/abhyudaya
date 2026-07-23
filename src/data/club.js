export const club = {
  name: "Abhyudaya",
  fullName: "Abhyudaya Club",
  institute: "Maharana Pratap Engineering College (MPEC), Kanpur",
  department: "Department of Basic Sciences & Humanities",
  tagline: "Curiosity to Creation.",
  meaning:
    '"Abhyudaya" is a Sanskrit word meaning rise, ascent, and prosperity — a fitting name for a club built on the idea that every idea, like every flight, begins on the ground.',
};

export const socials = {
  instagram: "https://www.instagram.com/abhyudaya_official/",
  linkedin:
    "https://www.linkedin.com/company/abhyudayaclubmpec/posts/?feedView=all",
  email: "abhyudayaclubmpec@gmail.com",
};

export const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Events", to: "/events" },
  { label: "Blog", to: "/blog" },
  { label: "Team", to: "/team" },
  { label: "Gallery", to: "/gallery" },
  { label: "Contact", to: "/contact" },
];
// Events drawn from the club's public activity, including the TechBloom 2.0
// fest lineup.
export const events = [
  {
    slug: "techbloom-2",
    name: "TechBloom 2.0",
    kind: "Flagship Fest",
    summary:
      "The club's flagship annual technical fest, bringing speaker sessions, competitions, and hands-on workshops together under one roof.",
    detail:
      "Organized under the Department of Basic Sciences & Humanities, TechBloom 2.0 combined inspiring talks with competitions, workshops, and a live aircraft flying session.",
    photo: "assets/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg",
    photos: [],
    featured: true,
    subEvents: [
      {
        slug: "quiztronix",
        name: "Quiztronix",
        kind: "Quiz",
        summary:
          "A fast-paced technical quiz that tests knowledge across science and engineering.",
        detail:
          "Teams compete through multiple elimination rounds covering programming, electronics, aptitude, and general technical awareness.",
      },
      {
        slug: "poster-verse",
        name: "Poster Verse",
        kind: "Design Competition",
        summary:
          "A creative poster-making competition based on technical and social themes.",
        detail:
          "Participants design and present original posters judged on creativity, relevance, and presentation.",
      },
      {
        slug: "tech-trolls",
        name: "Tech-Trolls",
        kind: "Fun Tech Challenge",
        summary:
          "A rapid-fire technical challenge mixed with fun activities.",
        detail:
          "An exciting event combining technical questions with entertaining surprise rounds.",
      },
      {
        slug: "trail-blaze",
        name: "Trail Blaze",
        kind: "Treasure Hunt",
        summary:
          "A campus-wide treasure hunt based on clues and technical puzzles.",
        detail:
          "Participants solve clues spread across the campus to reach the final destination before competing teams.",
      },
      {
        slug: "nextgen-ventures",
        name: "NextGen Ventures",
        kind: "Startup Pitch",
        summary:
          "An entrepreneurship competition where students present startup ideas.",
        detail:
          "Teams pitch innovative business ideas before a panel of judges and receive expert feedback.",
      },
    ],
  },

  {
    slug: "aeromodelling-workshop",
    name: "Aeromodelling & RC Aircraft Design",
    kind: "Workshop",
    summary:
      "A practical workshop on RC aircraft designing and flying.",
    detail:
      "Participants learned aircraft design fundamentals and experienced a live RC aircraft flying session.",
    photo: "assets/AM3COVER.jpg",
    photos: [],
  },

  {
    slug: "website-dev-workshop",
    name: "Website Development Workshop",
    kind: "Workshop",
    summary:
      "A beginner-friendly workshop on creating responsive websites.",
    detail:
      "Students built a complete website using modern web technologies through hands-on sessions.",
    photo: "assets/WD4COVER.jpg",
    photos: [],
  },

  {
    slug: "antariksh-spradha",
    name: "Antariksh Spradha",
    kind: "Astronomy Festival",
    summary:
      "A three-day astronomy and space science festival.",
    detail:
      "Day 1: Space Quiz on Unstop. Day 2: Expert lecture by IIT Kanpur. Day 3: Night sky observation with IIT Kanpur Astro Club.",
    photo: "assets/cover2.jpg",
    photos: [],
  },
];
export const team = {
  faculty: [
    {
      name: "Dr. Anupama Mathur",
      role: "Faculty Advisor",
      image:
        "https://www.image2url.com/r2/default/images/1782925455771-fcabd88a-9d76-44aa-8731-ebbb72274fd0.jpeg",
      linkedin: "https://www.linkedin.com/in/anupama-mathur-426578263/",
    },
  ],

  core: [
    {
      name: "N/A",
      role: "President",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "",
    },
    {
      name: "N/A",
      role: "Vice President",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "",
    },
    {
      name: "Unnati Pal",
      role: "General Secretary",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/unnatii05/",
    },
    {
      name: "Ishan Shukla",
      role: "Operations Lead",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/ishanshukla2/",
    },
    {
      name: "Virat Mishra",
      role: "Technical Lead",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/viratmishra24/",
    },
    {
      name: "Sharad Agnihotri",
      role: "PR Lead",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/sharad-agnihotri-628938315/",
    },
    {
      name: "Tilak Rajawat",
      role: "Core Member",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/tilakraj-singh-rajawat-121y/",
    },
    {
      name: "Kuldeep Yadav",
      role: "Core Member",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin: "https://www.linkedin.com/in/kuldeep-yadav-cse28/",
    },
    {
      name: "Shashwat Singh",
      role: "Core Member",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin:
        "https://www.linkedin.com/in/shashwat-singh-8a5784362/",
    },
    {
      name: "Arpit Singh",
      role: "Core Member",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin:
        "https://www.linkedin.com/in/arpit-singh-1004a8327/",
    },
  ],
};