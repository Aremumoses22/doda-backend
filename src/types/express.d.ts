// Express Request type augmentation — adds req.user to every request
// This file must be imported or included for the types to take effect.

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
      }
    }
  }
}

export {}
