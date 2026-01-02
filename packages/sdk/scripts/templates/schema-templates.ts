export const schemaTemplates = [
  {
    "name": "PersonalInfo",
    "template": "name: String, age: u8, is_student: bool"
  },
  {
    "name": "VehicleRegistration",
    "template": "vin: String, make: String, model: String, year: u16, owner: Address"
  },
  {
    "name": "FinancialTransaction",
    "template": "transaction_id: u64, amount: u128, sender: Address, receiver: Address, timestamp: u64"
  },
  {
    "name": "HealthRecord",
    "template": "patient_id: String, blood_type: String, height: u16, weight: u16, allergies: Vector<String>"
  },
  {
    "name": "ProductInventory",
    "template": "product_id: String, name: String, price: u64, quantity: u32, categories: Vector<String>"
  },
  {
    "name": "SocialMediaPost",
    "template": "post_id: u64, author: Address, content: String, likes: u32, tags: Vector<String>"
  },
  {
    "name": "WeatherData",
    "template": "location: String, temperature: i8, humidity: u8, wind_speed: u8, is_raining: bool"
  },
  {
    "name": "AcademicTranscript",
    "template": "student_id: String, course: String, grade: u8, credits: u8, semester: String"
  },
  {
    "name": "RealEstateListing",
    "template": "property_id: String, address: String, price: u128, bedrooms: u8, bathrooms: u8, square_feet: u32"
  },
  {
    "name": "FlightInformation",
    "template": "flight_number: String, departure: String, arrival: String, seats: u16, is_on_time: bool"
  },
  {
    "name": "CryptoWallet",
    "template": "wallet_address: Address, balance: u256, transaction_count: u64"
  },
  {
    "name": "VotingSystem",
    "template": "proposal_id: u32, title: String, description: String, yes_votes: u64, no_votes: u64, abstain: u64"
  },
  {
    "name": "LibraryBook",
    "template": "isbn: String, title: String, author: String, publication_year: u16, available_copies: u8"
  },
  {
    "name": "SmartHomeDevice",
    "template": "device_id: String, type: String, is_online: bool, battery_level: u8, firmware_version: String"
  },
  {
    "name": "AthleteStats",
    "template": "player_id: String, name: String, team: String, games_played: u16, points_scored: u32, is_captain: bool"
  },
  {
    "name": "MusicTrack",
    "template": "track_id: u64, title: String, artist: String, duration: u16, release_year: u16, genres: Vector<String>"
  },
  {
    "name": "Recipe",
    "template": "recipe_id: String, name: String, ingredients: Vector<String>, prep_time: u16, cooking_time: u16, servings: u8"
  },
  {
    "name": "InsurancePolicy",
    "template": "policy_number: String, holder: Address, premium: u64, coverage_amount: u128, start_date: u64, end_date: u64"
  },
  {
    "name": "EcommerceOrder",
    "template": "order_id: u64, customer: Address, items: Vector<String>, total_amount: u64, is_paid: bool, shipping_address: String"
  },
  {
    "name": "BlockchainTransaction",
    "template": "block_height: u64, transaction_hash: String, from: Address, to: Address, value: u256, gas_price: u64, gas_used: u64"
  }
]
