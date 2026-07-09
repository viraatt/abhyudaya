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
  { label: "Team", to: "/team" },
  { label: "Gallery", to: "/gallery" },
  { label: "Contact", to: "/contact" },
];

// Events drawn from the club's public activity, including the TechBloom 2.0
// fest lineup. Descriptions are written to match each event's name and
// format — replace with exact rules/dates as the club finalizes them.
export const events = [
  {
    slug: "techbloom-2",
    name: "TechBloom 2.0",
    kind: "Flagship Fest",
    summary:
      "The club\u2019s flagship annual technical fest, bringing speaker sessions, competitions, and hands-on workshops together under one roof.",
    detail:
      "Organized under the Department of Basic Sciences & Humanities, TechBloom 2.0 combined inspiring talks with a full slate of competitions and workshops, closing with a live aircraft flying session on the lawns.",
      photo:'assets/Techbloom/28da270f-9929-4ca8-9eea-062077bceb15.jpg',
      photos:['assets/Techbloom/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg','assets/Techbloom/1f112ed4-a1a4-4b0b-991a-4064a52035bd.jpg',
  'assets/Techbloom/03b4e067-e247-48b3-aa08-59409667aefa.jpg',
  'assets/Techbloom/8a8975f1-0101-4645-83f0-cc4019416d06.jpg',
  'assets/Techbloom/9ae3f21a-b6bf-4115-8c6b-a44b01f95bf9.jpg',
  'assets/Techbloom/28da270f-9929-4ca8-9eea-062077bceb15.jpg',
  'assets/Techbloom/837f9d61-3fd2-4784-8962-d51f8619ca64.jpg',
  'assets/Techbloom/840b23be-54d8-4daf-a80a-2a1a4cc04bbe.jpg',
  'assets/Techbloom/39166e54-d693-4c9e-a7aa-becb0348d2d2.jpg',
  'assets/Techbloom/714830cd-da57-427d-b09b-fea3895a0af9.jpg',
  'assets/Techbloom/b4b47890-e809-4893-bd22-c7b56cd66de1.jpg',
  'assets/Techbloom/c1e9e783-8ac1-4260-8d23-d5f18f5fd2b6.jpg',
  'assets/Techbloom/fff52caf-ef8a-4f20-aed9-9941301cb12b.jpg',],
    featured: true,
    subEvents: [
      {
        slug: "quiztronix",
        name: "Quiztronix",
        kind: "Quiz",
        summary:
          "A fast-paced technical quiz that tests breadth of knowledge across science and engineering.",
        detail:
          "Teams race through rounds covering electronics, computing, and general technical awareness, with elimination rounds building to a high-stakes finale.",
      },
      {
        slug: "poster-verse",
        name: "Poster Verse",
        kind: "Design Competition",
        summary:
          "A poster-making competition where participants visualize a technical or social theme.",
        detail:
          "Entrants design and present original posters on a themed prompt, judged on concept, clarity, and visual execution.",
      },
      {
        slug: "tech-trolls",
        name: "Tech-Trolls",
        kind: "Fun Tech Challenge",
        summary:
          "A light-hearted, high-energy tech challenge built around quick thinking under pressure.",
        detail:
          "A rapid-round format that mixes technical trivia with on-the-spot problem solving, kept fast and fun for every skill level.",
      },
      {
        slug: "trail-blaze",
        name: "Trail Blaze",
        kind: "Treasure Hunt",
        summary:
          "A campus-wide trail hunt that turns clues and puzzles into a race across MPEC.",
        detail:
          "Teams follow a chain of technical and lateral-thinking clues across campus, with the fastest correct trail taking the win.",
      },
      {
        slug: "nextgen-ventures",
        name: "NextGen Ventures",
        kind: "Pitch Competition",
        summary:
          "An entrepreneurship-style pitch event for early-stage ideas and student ventures.",
        detail:
          "Students pitch original venture ideas to a panel, practicing the same structure and scrutiny used in real startup pitch rooms.",
      },
    ],
  },
  {
    slug: "aeromodelling-workshop",
    name: "Aeromodelling & RC Aircraft Design ",
    kind: "Workshop",
    summary:
      "A hands-on session on designing and building RC aircraft, ending with a live flying demonstration.",
    detail:
      "Participants built their own aircraft models from the ground up, then took them outdoors for a live flying session — the standout moment of TechBloom 2.0.",
      photo:'assets/Aeromodeling & webdev wokshp/AM3COVER.jpg',
      photos:[  'assets/Aeromodeling & webdev wokshp/AM1.jpg',
  'assets/Aeromodeling & webdev wokshp/AM2.jpg',
  'assets/Aeromodeling & webdev wokshp/AM3COVER.jpg',
  'assets/Aeromodeling & webdev wokshp/AM4.jpg',]
  },
  {
    slug: "website-dev-workshop",
    name: "Website Development Workshop",
    kind: "Workshop",
    summary:
      "A practical, build-along session covering the fundamentals of building a website.",
    detail:
      "A guided, hands-on workshop that takes participants from a blank page to a working site, focused on skills they can keep using after the event ends.",
      photo:'assets/Aeromodeling & webdev wokshp/WD4COVER.jpg',
      photos:[ 'assets/Aeromodeling & webdev wokshp/WD1.jpg',
  'assets/Aeromodeling & webdev wokshp/WD2.jpg',
  'assets/Aeromodeling & webdev wokshp/WD3.jpg',
  'assets/Aeromodeling & webdev wokshp/WD5.jpg',]
  },
  {
    slug: "antariksh spradha",
    name: "Antariksh spradha",
    kind: "Astronomy Festival",
    summary: "A 3-day space event with quiz, lecture, and star gazing.",
    detail:
      "Day 1 begins with a quiz hosted on Unstop to challenge participants on space and science knowledge. Day 2 features an inspiring guest lecture by a professor from IIT Kanpur, offering insights into space research and innovation. Day 3 concludes with a night star-gazing event in collaboration with the IIT Kanpur AstroClub, giving participants a hands-on experience of exploring the universe.",
    photo: "assets/antariksh_spardha/cover2.jpg",
    photos: [
      "assets/antariksh_spardha/cover1.jpg",
      "assets/antariksh_spardha/20251015_85400PMByGPSMapCamera.jpg",
      'assets/antariksh_spardha/20251015_74225PMByGPSMapCamera.jpg',
  'assets/antariksh_spardha/20251015_73701PMByGPSMapCamera.jpg',
      "assets/antariksh_spardha/PXL_20251015_164227412.jpg",
      "assets/antariksh_spardha/PXL_20251015_164514382.jpg",
       "assets/antariksh_spardha/20251011_32908PMByGPSMapCamera.jpg.jpeg",
      "assets/antariksh_spardha/20251011_41133PMByGPSMapCamera.jpg.jpeg",
      "assets/antariksh_spardha/20251011_41410PMByGPSMapCamera.jpg.jpeg",
    ],
  },
];
// Placeholder roster — swap in real names, photos, and socials for the
// club's current core team and faculty coordinator.
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
      linkedin: "linkedin.com/in/shashwat-singh-8a5784362/?skipRedirect=true",
    },
    {
      name: "Arpit Singh",
      role: "Core Member",
      image:
        "https://cdn.phototourl.com/free/2026-07-02-81b91a2b-69df-4bd0-8e49-fb49b7995ab5.png",
      linkedin:
        "https://www.linkedin.com/in/arpit-singh-1004a8327/?skipRedirect=true",
    },
  ],
};
