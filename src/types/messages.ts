export interface ConversationListItem {
  bookingId: string
  otherParty: {
    id: string
    name: string
    image: string | null
  }
  service: {
    title: string
    category: string
  }
  booking: {
    status: string
    date: string
    time: string
    totalPrice: number
    locationType: string
    address: string | null
  }
  lastMessage: {
    text: string
    createdAt: string
    senderId: string
  } | null
  unreadCount: number
}

export interface MessageWithSender {
  id: string
  bookingId: string
  senderId: string
  text: string
  read: boolean
  createdAt: string
  sender: {
    id: string
    name: string | null
    image: string | null
  }
}

export interface BookingDetailsForMessages {
  id: string
  status: string
  date: string
  time: string
  totalPrice: number
  locationType: string
  address: string | null
  notes: string | null
  service: {
    id: string
    title: string
    category: string
    duration: number
    price: number
  }
  customer: {
    id: string
    name: string
    image: string | null
  }
  provider: {
    id: string
    name: string
    image: string | null
  }
}
