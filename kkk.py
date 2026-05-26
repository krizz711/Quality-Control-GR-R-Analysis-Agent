
import asyncio
from agent.orchestrator import QualityOrchestrator

event = {
    'study_type': 'grr',
    'equipment_id': 'CMM-002',
    'characteristic_name': 'bore_diameter',
    'measurements': [
        {'part':'P1','operator':'A','measurement':25.02},
        {'part':'P1','operator':'A','measurement':25.04},
        {'part':'P2','operator':'A','measurement':24.98},
        {'part':'P2','operator':'A','measurement':24.97},
        {'part':'P3','operator':'A','measurement':25.11},
        {'part':'P3','operator':'A','measurement':25.09},
        {'part':'P1','operator':'B','measurement':25.01},
        {'part':'P1','operator':'B','measurement':25.05},
        {'part':'P2','operator':'B','measurement':24.96},
        {'part':'P2','operator':'B','measurement':24.99},
        {'part':'P3','operator':'B','measurement':25.10},
        {'part':'P3','operator':'B','measurement':25.08},
        {'part':'P1','operator':'C','measurement':25.03},
        {'part':'P1','operator':'C','measurement':25.02},
        {'part':'P2','operator':'C','measurement':24.97},
        {'part':'P2','operator':'C','measurement':24.98},
        {'part':'P3','operator':'C','measurement':25.12},
        {'part':'P3','operator':'C','measurement':25.10}
    ]
}

async def run():
    orch = QualityOrchestrator()
    result = await orch.handle_measurement_event(event)
    print('GRR Result:', result)

asyncio.run(run())
