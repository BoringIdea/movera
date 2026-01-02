export const schemaInstances = [
  {
    name: "PersonalInfo",
    data: { name: "John Doe", age: 25n, is_student: true }
  },
  {
    name: "VehicleRegistration",
    data: { vin: "1HGCM82633A004352", make: "Honda", model: "Accord", year: 2022n, owner: "0x1234567890abcdef" }
  },
  {
    name: "FinancialTransaction",
    data: { transaction_id: 123456789n, amount: 1000000n, sender: "0xabcdef1234567890", receiver: "0x0987654321fedcba", timestamp: 1678901234n }
  },
  {
    name: "HealthRecord",
    data: { patient_id: "P12345", blood_type: "A", height: 175n, weight: 70n, allergies: ["pollen", "peanuts"] }
  },
  {
    name: "ProductInventory",
    data: { product_id: "SKU001", name: "Smartphone", price: 399900n, quantity: 100n, categories: ["electronics", "mobile"] }
  },
  {
    name: "SocialMediaPost",
    data: { post_id: 987654321n, author: "0x2468101214161820", content: "What a beautiful day!", likes: 42n, tags: ["lifestyle", "mood"] }
  },
  {
    name: "WeatherData",
    data: { location: "Beijing", temperature: 25n, humidity: 60n, wind_speed: 10n, is_raining: false }
  },
  {
    name: "AcademicTranscript",
    data: { student_id: "S20230001", course: "Advanced Mathematics", grade: 85n, credits: 4n, semester: "Spring 2023" }
  },
  {
    name: "RealEstateListing",
    data: { property_id: "RL001", address: "Sunshine 100 Community, Chaoyang District", price: 5000000n, bedrooms: 3n, bathrooms: 2n, square_feet: 120n }
  },
  {
    name: "FlightInformation",
    data: { flight_number: "CA1234", departure: "Beijing", arrival: "Shanghai", seats: 180n, is_on_time: true }
  },
  {
    name: "CryptoWallet",
    data: { wallet_address: "0x9876543210fedcba", balance: 1000000000000000000n, transaction_count: 50n }
  },
  {
    name: "VotingSystem",
    data: { proposal_id: 42n, title: "Community Park Construction Proposal", description: "Build a new park within the community", yes_votes: 1500n, no_votes: 500n, abstain: 200n }
  },
  {
    name: "LibraryBook",
    data: { isbn: "9787020002207", title: "Dream of the Red Chamber", author: "Cao Xueqin", publication_year: 1791n, available_copies: 5n }
  },
  {
    name: "SmartHomeDevice",
    data: { device_id: "SHD001", type: "Smart Bulb", is_online: true, battery_level: 80n, firmware_version: "v2.1.0" }
  },
  {
    name: "AthleteStats",
    data: { player_id: "NBA001", name: "Yao Ming", team: "Houston Rockets", games_played: 486n, points_scored: 9247n, is_captain: true }
  },
  {
    name: "MusicTrack",
    data: { track_id: 123456n, title: "The Moon Represents My Heart", artist: "Teresa Teng", duration: 215n, release_year: 1977n, genres: ["pop", "classic"] }
  },
  {
    name: "Recipe",
    data: { recipe_id: "R001", name: "Kung Pao Chicken", ingredients: ["chicken", "peanuts", "chili peppers"], prep_time: 15n, cooking_time: 20n, servings: 4n }
  },
  {
    name: "InsurancePolicy",
    data: { policy_number: "IP12345", holder: "0x1357924680abcdef", premium: 1000n, coverage_amount: 1000000n, start_date: 1672531200n, end_date: 1704067200n }
  },
  {
    name: "EcommerceOrder",
    data: { order_id: 987654n, customer: "0xfedcba9876543210", items: ["smartphone", "earphones"], total_amount: 4599n, is_paid: true, shipping_address: "1 Zhongguancun Street, Haidian District, Beijing" }
  },
  {
    name: "BlockchainTransaction",
    data: { block_height: 12345678n, transaction_hash: "0xabcdef1234567890abcdef1234567890", from: "0x1111222233334444", to: "0x5555666677778888", value: 1000000000000000000n, gas_price: 20000000000n, gas_used: 21000n }
  }
];