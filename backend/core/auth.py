from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.core.config import supabase

security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Security(security)):
    """
    Validates the Supabase JWT token and returns the user object.
    """
    token = auth.credentials
    try:
        # Verify the token with Supabase
        res = supabase.auth.get_user(token)
        if not res.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        return res.user
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
