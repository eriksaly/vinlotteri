export interface AppUser {
  email: string
  name: string
  role: 'ADMIN' | 'USER'
}

export interface UserDto {
  id: number
  email: string
  name: string
  role: 'ADMIN' | 'USER'
  createdAt: string
  lastLoginAt: string | null
}

export interface Participant {
  id: number
  name: string
  tag: string
  hasPhoto: boolean
  createdAt: string
}

export interface Buyer {
  participant: Participant
  ticketCount: number
  ticketPercentage: number
  ticketNumbers: number[]
}

export interface LotteryInfo {
  id: number
  name: string
  status: 'OPEN' | 'DRAWING' | 'CLOSED'
  vippsNumber: string
  pricePerTicket: number
  totalTickets: number
  wineCount: number | null
  createdAt: string
}

export interface InventoryItem {
  id: number
  vinmonopoletCode: string
  name: string
  price: number
  category: string
  quantity: number
  country: string
  imageUrl: string
  createdAt: string
  // Points and terningkast from VG's most recent review; null when VG hasn't reviewed the product
  vgScore: number | null
  vgGrade: number | null
}

export interface LotteryPrize {
  id: number
  position: number
  items: InventoryItem[]
  winnerId: number | null
}

export interface Winner {
  position: number
  ticketNumber: number
  participantId: number
  participantName: string
  participantTag: string
  drawnAt: string
  prize?: LotteryPrize | null
}

export interface AllTimeParticipantStats {
  participantId: number
  name: string
  tag: string
  hasPhoto: boolean
  totalTicketsBought: number
  totalWins: number
  lotteriesParticipated: number
  lotteriesWon: number
  winLotteryRate: number
}

export interface Streak {
  participantId: number
  name: string
  tag: string
  hasPhoto: boolean
  streak: number
  lotteriesParticipated: number
}

export interface LotteryParticipantStats {
  participantId: number
  name: string
  tag: string
  hasPhoto: boolean
  ticketsBought: number
  wins: number
  winRatio: number
}

export interface LotteryStatistics {
  lotteryId: number
  lotteryName: string
  createdAt: string
  totalTickets: number
  totalAmountNok: number
  winners: Winner[]
  participants: LotteryParticipantStats[]
  luckiest: LotteryParticipantStats | null
  unluckiest: LotteryParticipantStats | null
}

export interface AllTimeStatistics {
  totalLotteries: number
  totalParticipants: number
  topLucky: AllTimeParticipantStats[]
  topUnlucky: AllTimeParticipantStats[]
  topTicketBuyers: AllTimeParticipantStats[]
  longestWinStreak: Streak[]
  longestLoseStreak: Streak[]
}

export interface DrawResult {
  winner: Winner
  remainingTickets: number
  prize?: LotteryPrize | null
}

export interface VinmonopoletProduct {
  code: string
  name: string
  price: number | null
  url: string
  category: string
  country: string
}

export interface ShoppingSuggestions {
  products: VinmonopoletProduct[]
  prizeCount: number
}

export interface ParticipantBalance {
  participantId: number
  name: string
  tag: string
  ticketsBought: number
  amountSpentNok: number
  wins: number
  winsWithoutValue: number
  prizeValueNok: number
  netNok: number
}

export interface CellarBalance {
  totalLotteries: number
  pricePerTicket: number
  totalSpentNok: number
  totalPrizeValueNok: number
  netNok: number
  winsWithoutValue: number
  participants: ParticipantBalance[]
}

export interface WineProduct {
  productId: string
  productShortName: string | null
  productTypeName: string | null
  subProductTypeName: string | null
  country: string | null
  regionDetailed: string | null
  volume: number | null
  price: number | null
  // Price per litre divided by the score; lower is better value
  pricePerScore: number | null
  // null until Horten's stock has been checked
  inStock: boolean | null
  // Bottles in stock, when Vinmonopolet reported a count
  hortenStock: number | null
  stockCheckedAt: string | null
  score: number
  grade: number
  // Vintage of the most recent review
  vintage: number | null
  // The vintage Vinmonopolet sells now, when known
  vmpVintage: number | null
  reviewCount: number
  lastReviewedAt: string
  imageUrl: string
  vinmonopoletUrl: string
}

export interface WineReview {
  id: number
  vintage: number | null
  score: number
  grade: number
  lead: string | null
  authorDescription: string | null
  price: number | null
  articleUrl: string | null
  reviewedAt: string
}

export interface WineReviewSyncResult {
  fetchedReviews: number
  newReviews: number
  updatedReviews: number
  newProducts: number
}
