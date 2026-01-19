export interface NAICSCode {
  code: string;
  description: string;
}

export interface NAICSCategory {
  category: string;
  codes: NAICSCode[];
}

export const AEROSPACE_DEFENSE_NAICS: NAICSCategory[] = [
  {
    category: "Ammunition & Ordnance",
    codes: [
      { code: "332992", description: "Small Arms Ammunition Manufacturing" },
      { code: "332993", description: "Ammunition (except Small Arms) Manufacturing" },
      { code: "332994", description: "Small Arms, Ordnance, and Ordnance Accessories Manufacturing" },
      { code: "325920", description: "Explosives Manufacturing" },
    ],
  },
  {
    category: "Aircraft & Aerospace Manufacturing",
    codes: [
      { code: "336411", description: "Aircraft Manufacturing" },
      { code: "336412", description: "Aircraft Engine and Engine Parts Manufacturing" },
      { code: "336413", description: "Other Aircraft Part and Auxiliary Equipment Manufacturing" },
      { code: "336414", description: "Guided Missile and Space Vehicle Manufacturing" },
      { code: "336415", description: "Guided Missile and Space Vehicle Propulsion Unit and Parts Manufacturing" },
      { code: "336419", description: "Other Guided Missile and Space Vehicle Parts and Auxiliary Equipment Manufacturing" },
    ],
  },
  {
    category: "Military Vehicles & Equipment",
    codes: [
      { code: "336120", description: "Heavy Duty Truck Manufacturing" },
      { code: "336211", description: "Motor Vehicle Body Manufacturing" },
      { code: "336350", description: "Motor Vehicle Transmission and Power Train Parts Manufacturing" },
      { code: "336390", description: "Other Motor Vehicle Parts Manufacturing" },
      { code: "336992", description: "Military Armored Vehicle, Tank and Tank Component Manufacturing" },
    ],
  },
  {
    category: "Naval & Maritime",
    codes: [
      { code: "336611", description: "Ship Building and Repairing" },
      { code: "336612", description: "Boat Building" },
      { code: "336510", description: "Railroad Rolling Stock Manufacturing" },
      { code: "336999", description: "All Other Transportation Equipment Manufacturing" },
    ],
  },
  {
    category: "Electronics & Communications",
    codes: [
      { code: "334111", description: "Electronic Computer Manufacturing" },
      { code: "334112", description: "Computer Storage Device Manufacturing" },
      { code: "334118", description: "Computer Terminal and Other Computer Peripheral Equipment Manufacturing" },
      { code: "334210", description: "Telephone Apparatus Manufacturing" },
      { code: "334220", description: "Radio and Television Broadcasting and Wireless Communications Equipment Manufacturing" },
      { code: "334290", description: "Other Communications Equipment Manufacturing" },
      { code: "334310", description: "Audio and Video Equipment Manufacturing" },
      { code: "334412", description: "Bare Printed Circuit Board Manufacturing" },
      { code: "334413", description: "Semiconductor and Related Device Manufacturing" },
      { code: "334416", description: "Capacitor, Resistor, Coil, Transformer, and Other Inductor Manufacturing" },
      { code: "334417", description: "Electronic Connector Manufacturing" },
      { code: "334418", description: "Printed Circuit Assembly (Electronic Assembly) Manufacturing" },
      { code: "334419", description: "Other Electronic Component Manufacturing" },
    ],
  },
  {
    category: "Navigation, Guidance & Detection Systems",
    codes: [
      { code: "334511", description: "Search, Detection, Navigation, Guidance, Aeronautical, and Nautical System and Instrument Manufacturing" },
      { code: "334512", description: "Automatic Environmental Control Manufacturing for Residential, Commercial and Appliance Use" },
      { code: "334513", description: "Instruments and Related Products Manufacturing for Measuring, Displaying, and Controlling Industrial Process Variables" },
      { code: "334514", description: "Totalizing Fluid Meter and Counting Device Manufacturing" },
      { code: "334515", description: "Instrument Manufacturing for Measuring and Testing Electricity and Electrical Signals" },
      { code: "334516", description: "Analytical Laboratory Instrument Manufacturing" },
      { code: "334517", description: "Irradiation Apparatus Manufacturing" },
      { code: "334519", description: "Other Measuring and Controlling Device Manufacturing" },
      { code: "334510", description: "Electromedical and Electrotherapeutic Apparatus Manufacturing" },
    ],
  },
  {
    category: "Electrical Equipment",
    codes: [
      { code: "335312", description: "Motor and Generator Manufacturing" },
      { code: "335313", description: "Switchgear and Switchboard Apparatus Manufacturing" },
      { code: "335314", description: "Relay and Industrial Control Manufacturing" },
      { code: "335910", description: "Battery Manufacturing" },
      { code: "335921", description: "Fiber Optic Cable Manufacturing" },
      { code: "335929", description: "Other Communication and Energy Wire Manufacturing" },
      { code: "335931", description: "Current Carrying Wiring Device Manufacturing" },
      { code: "335932", description: "Noncurrent Carrying Wiring Device Manufacturing" },
    ],
  },
  {
    category: "Power Generation & Turbines",
    codes: [
      { code: "333611", description: "Turbine and Turbine Generator Set Unit Manufacturing" },
      { code: "333618", description: "Other Engine Equipment Manufacturing" },
      { code: "333912", description: "Air and Gas Compressor Manufacturing" },
    ],
  },
  {
    category: "Manufacturing - Machinery & Tools",
    codes: [
      { code: "333120", description: "Construction Machinery Manufacturing" },
      { code: "333131", description: "Mining Machinery and Equipment Manufacturing" },
      { code: "333242", description: "Semiconductor Machinery Manufacturing" },
      { code: "333511", description: "Industrial Mold Manufacturing" },
      { code: "333514", description: "Special Die and Tool, Die Set, Jig and Fixture Manufacturing" },
      { code: "333515", description: "Cutting Tool and Machine Tool Accessory Manufacturing" },
      { code: "333517", description: "Machine Tool Manufacturing" },
      { code: "333992", description: "Welding and Soldering Equipment Manufacturing" },
      { code: "333993", description: "Packaging Machinery Manufacturing" },
      { code: "333994", description: "Industrial Process Furnace and Oven Manufacturing" },
    ],
  },
  {
    category: "Medical & Surgical Equipment",
    codes: [
      { code: "339112", description: "Surgical and Medical Instrument Manufacturing" },
      { code: "339113", description: "Surgical Appliance and Supplies Manufacturing" },
      { code: "339114", description: "Dental Equipment and Supplies Manufacturing" },
      { code: "339115", description: "Ophthalmic Goods Manufacturing" },
    ],
  },
  {
    category: "Metals & Materials Processing",
    codes: [
      { code: "332111", description: "Iron and Steel Forging" },
      { code: "332112", description: "Nonferrous Forging" },
      { code: "332114", description: "Custom Roll Forming" },
      { code: "332117", description: "Powder Metallurgy Part Manufacturing" },
      { code: "332312", description: "Fabricated Structural Metal Manufacturing" },
      { code: "332313", description: "Plate Work Manufacturing" },
      { code: "332410", description: "Power Boiler and Heat Exchanger Manufacturing" },
      { code: "332420", description: "Metal Tank (Heavy Gauge) Manufacturing" },
      { code: "332510", description: "Hardware Manufacturing" },
      { code: "332811", description: "Metal Heat Treating" },
      { code: "332813", description: "Electroplating, Plating, Polishing, Anodizing and Coloring" },
    ],
  },
  {
    category: "Valves, Fittings & Mechanical Components",
    codes: [
      { code: "332911", description: "Industrial Valve Manufacturing" },
      { code: "332912", description: "Fluid Power Valve and Hose Fitting Manufacturing" },
      { code: "332919", description: "Other Metal Valve and Pipe Fitting Manufacturing" },
      { code: "332991", description: "Ball and Roller Bearing Manufacturing" },
      { code: "333995", description: "Fluid Power Cylinder and Actuator Manufacturing" },
      { code: "333996", description: "Fluid Power Pump and Motor Manufacturing" },
    ],
  },
  {
    category: "Engineering Services",
    codes: [
      { code: "541330", description: "Engineering Services" },
      { code: "541310", description: "Architectural Services" },
      { code: "541320", description: "Landscape Architectural Services" },
      { code: "541340", description: "Drafting Services" },
      { code: "541350", description: "Building Inspection Services" },
      { code: "541360", description: "Geophysical Surveying and Mapping Services" },
      { code: "541370", description: "Surveying and Mapping (except Geophysical) Services" },
      { code: "541380", description: "Testing Laboratories and Services" },
    ],
  },
  {
    category: "Research & Development",
    codes: [
      { code: "541713", description: "Research and Development in Nanotechnology" },
      { code: "541714", description: "Research and Development in Biotechnology (except Nanobiotechnology)" },
      { code: "541715", description: "Research and Development in the Physical, Engineering, and Life Sciences" },
      { code: "541720", description: "Research and Development in the Social Sciences and Humanities" },
    ],
  },
  {
    category: "Computer & IT Services",
    codes: [
      { code: "541511", description: "Custom Computer Programming Services" },
      { code: "541512", description: "Computer Systems Design Services" },
      { code: "541513", description: "Computer Facilities Management Services" },
      { code: "541519", description: "Other Computer Related Services" },
      { code: "518210", description: "Data Processing, Hosting, and Related Services" },
    ],
  },
  {
    category: "Consulting & Management Services",
    codes: [
      { code: "541611", description: "Administrative Management and General Management Consulting Services" },
      { code: "541612", description: "Human Resources Consulting Services" },
      { code: "541613", description: "Marketing Consulting Services" },
      { code: "541614", description: "Process, Physical Distribution and Logistics Consulting Services" },
      { code: "541618", description: "Other Management Consulting Services" },
      { code: "541620", description: "Environmental Consulting Services" },
      { code: "541690", description: "Other Scientific and Technical Consulting Services" },
    ],
  },
  {
    category: "Professional & Technical Services",
    codes: [
      { code: "541110", description: "Offices of Lawyers" },
      { code: "541211", description: "Offices of Certified Public Accountants" },
      { code: "541219", description: "Other Accounting Services" },
      { code: "541430", description: "Graphic Design Services" },
      { code: "541810", description: "Advertising Agencies" },
      { code: "541910", description: "Marketing Research and Public Opinion Polling" },
      { code: "541921", description: "Photography Studios, Portrait" },
      { code: "541922", description: "Commercial Photography" },
      { code: "541930", description: "Translation and Interpretation Services" },
      { code: "541990", description: "All Other Professional, Scientific and Technical Services" },
    ],
  },
  {
    category: "Facilities Support & Security",
    codes: [
      { code: "561210", description: "Facilities Support Services" },
      { code: "561310", description: "Employment Placement Agencies" },
      { code: "561320", description: "Temporary Help Services" },
      { code: "561421", description: "Telephone Answering Services" },
      { code: "561422", description: "Telemarketing Bureaus and Other Contact Centers" },
      { code: "561440", description: "Collection Agencies" },
      { code: "561450", description: "Credit Bureaus" },
      { code: "561491", description: "Repossession Services" },
      { code: "561499", description: "All Other Business Support Services" },
      { code: "561611", description: "Investigation Services" },
      { code: "561612", description: "Security Guards and Patrol Services" },
      { code: "561613", description: "Armored Car Services" },
      { code: "561621", description: "Security Systems Services (except Locksmiths)" },
      { code: "561622", description: "Locksmiths" },
    ],
  },
  {
    category: "Logistics & Support Services",
    codes: [
      { code: "488190", description: "Other Support Activities for Air Transportation" },
      { code: "488210", description: "Support Activities for Rail Transportation" },
      { code: "488310", description: "Port and Harbor Operations" },
      { code: "488320", description: "Marine Cargo Handling" },
      { code: "488330", description: "Navigational Services to Shipping" },
      { code: "488390", description: "Other Support Activities for Water Transportation" },
      { code: "488410", description: "Motor Vehicle Towing" },
      { code: "488490", description: "Other Support Activities for Road Transportation" },
      { code: "488510", description: "Freight Transportation Arrangement" },
      { code: "488991", description: "Packing and Crating" },
      { code: "488999", description: "All Other Support Activities for Transportation" },
    ],
  },
  {
    category: "Environmental & Remediation Services",
    codes: [
      { code: "562910", description: "Remediation Services" },
      { code: "562991", description: "Septic Tank and Related Services" },
      { code: "562998", description: "All Other Miscellaneous Waste Management Services" },
    ],
  },
  {
    category: "Construction & Site Preparation",
    codes: [
      { code: "236220", description: "Commercial and Institutional Building Construction" },
      { code: "237110", description: "Water and Sewer Line and Related Structures Construction" },
      { code: "237120", description: "Oil and Gas Pipeline and Related Structures Construction" },
      { code: "237130", description: "Power and Communication Line and Related Structures Construction" },
      { code: "237310", description: "Highway, Street, and Bridge Construction" },
      { code: "237990", description: "Other Heavy and Civil Engineering Construction" },
      { code: "238110", description: "Poured Concrete Foundation and Structure Contractors" },
      { code: "238120", description: "Structural Steel and Precast Concrete Contractors" },
      { code: "238210", description: "Electrical Contractors and Other Wiring Installation Contractors" },
      { code: "238220", description: "Plumbing, Heating, and Air Conditioning Contractors" },
      { code: "238910", description: "Site Preparation Contractors" },
      { code: "238990", description: "All Other Specialty Trade Contractors" },
    ],
  },
];

// Flattened list for search
export const ALL_NAICS_CODES: NAICSCode[] = AEROSPACE_DEFENSE_NAICS.flatMap(
  (category) => category.codes
);
