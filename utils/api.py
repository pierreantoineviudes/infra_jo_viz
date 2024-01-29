"""_summary_

Returns:
    _type_: _description_
"""
import requests


def make_api_call(limit, refine, offset):
    """_summary_

    Args:
        limit (_type_): _description_
        refine (_type_): _description_
        offset (_type_): _description_

    Returns:
        _type_: _description_
    """
    dataset = "data-es"
    base_url = f"https://equipements.sports.gouv.fr/api/explore/v2.1/catalog/datasets/{dataset}/records"
    params = {
        "limit": limit,
        "refine": refine,
        "offset": offset,
    }

    res = requests.get(url=base_url, params=params)
    return res.json()
