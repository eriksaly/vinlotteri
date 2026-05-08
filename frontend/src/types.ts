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

export interface Winner {
  position: number
  ticketNumber: number
  participantId: number
  participantName: string
  participantTag: string
  drawnAt: string
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
  longestWinStreak: Streak | null
  longestLoseStreak: Streak | null
}

export interface DrawResult {
  winner: Winner
  remainingTickets: number
}
