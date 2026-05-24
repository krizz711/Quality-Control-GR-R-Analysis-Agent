from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class MeasurementEvent(BaseModel):
    timestamp: datetime
    part_number: str
    characteristic_name: str
    nominal_value: Optional[float] = None
    measured_value: float
    unit: Optional[str] = "mm"
    operator_id: Optional[str] = None
    equipment_id: str
    shift: Optional[str] = None

    @field_validator("measured_value")
    @classmethod
    def value_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("measured_value must be positive")
        return v
