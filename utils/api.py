"""_summary_

Returns:
    _type_: _description_
"""
from typing import List
import requests


def make_api_call(limit: int, refine: List[str], offset: int) -> dict:
    """_summary_

    Args:
        limit (int): _description_
        refine (List[str]): _description_
        offset (int): _description_

    Returns:
        dict: _description_
    """
    dataset = "data-es"
    base_url = f"https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/{dataset}/records"
    params = {
        "limit": limit,
        "refine": refine,
        "offset": offset,
    }

    res = requests.get(url=base_url, params=params, timeout=2)
    return res.json()


def get_total_count(refine: List[str]) -> int:
    """_summary_

    Args:
        refine (List[str]): _description_

    Returns:
        int: _description_
    """
    dataset = "data-es"
    base_url = f"https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/{dataset}/records"
    params = {
        "refine": refine,
    }
    res = requests.get(url=base_url, params=params, timeout=2)
    total_count = res.json()["total_count"]
    return total_count
