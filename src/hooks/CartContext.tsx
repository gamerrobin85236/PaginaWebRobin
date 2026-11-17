import { createContext, useContext, useState, type ReactNode } from 'react'
import { useCart } from './useCart'

type CartValue = ReturnType<typeof useCart> & {
  open: boolean
  setOpen: (value: boolean) => void
}

const CartContext = createContext<CartValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const cart = useCart()
  const [open, setOpen] = useState(false)
  return <CartContext.Provider value={{ ...cart, open, setOpen }}>{children}</CartContext.Provider>
}

export function useCartContext(): CartValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCartContext debe usarse dentro de <CartProvider>')
  return ctx
}
