import datetime
import uuid

from sqlalchemy import UUID, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Measurement(Base):
    __tablename__ = "measurements"

    # TimescaleDB hypertables require the partition column in primary keys.
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True
    )
    part_number: Mapped[str] = mapped_column(String(64))
    characteristic_name: Mapped[str] = mapped_column(String(128))
    nominal_value: Mapped[float | None] = mapped_column(Float)
    measured_value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(16))
    operator_id: Mapped[str | None] = mapped_column(String(64))
    equipment_id: Mapped[str | None] = mapped_column(String(64))
    shift: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[datetime.datetime] = mapped_column(default=lambda: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))
    created_by: Mapped[str] = mapped_column(String(64), default="system")


class GrrStudy(Base):
    __tablename__ = "grr_studies"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    equipment_id: Mapped[str] = mapped_column(String(64))
    characteristic_name: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    ev: Mapped[float | None] = mapped_column(Float)
    av: Mapped[float | None] = mapped_column(Float)
    pv: Mapped[float | None] = mapped_column(Float)
    grr_pct: Mapped[float | None] = mapped_column(Float)
    ndc: Mapped[int | None] = mapped_column(Integer)
    acceptance_decision: Mapped[str | None] = mapped_column(String(32))
    report_path: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[str | None] = mapped_column(String(64))
    review_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(default=lambda: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))
    created_by: Mapped[str] = mapped_column(String(64), default="system")


class QualityViolation(Base):
    __tablename__ = "quality_violations"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    part_number: Mapped[str | None] = mapped_column(String(64))
    characteristic_name: Mapped[str | None] = mapped_column(String(128))
    violation_type: Mapped[str | None] = mapped_column(String(64))
    severity: Mapped[str | None] = mapped_column(String(16))
    measured_value: Mapped[float | None] = mapped_column(Float)
    ucl: Mapped[float | None] = mapped_column(Float)
    lcl: Mapped[float | None] = mapped_column(Float)
    alert_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime.datetime] = mapped_column(default=lambda: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))


class ReviewQueue(Base):
    __tablename__ = "review_queue"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    study_id: Mapped[uuid.UUID] = mapped_column(UUID, ForeignKey("grr_studies.id"))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    assigned_to: Mapped[str | None] = mapped_column(String(64))
    due_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    decision_notes: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime.datetime] = mapped_column(default=lambda: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))


__all__ = [
    "Base",
    "GrrStudy",
    "Measurement",
    "QualityViolation",
    "ReviewQueue",
]
