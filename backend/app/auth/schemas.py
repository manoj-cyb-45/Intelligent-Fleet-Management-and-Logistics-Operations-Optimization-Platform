from pydantic import BaseModel, Field


class LoginRequest(BaseModel):

    user_id: str = Field(
        min_length=1,
        max_length=50,
    )

    password: str = Field(
        min_length=1,
        max_length=100,
    )


class LoginResponse(BaseModel):

    access_token: str

    token_type: str

    user_id: str

    role: str