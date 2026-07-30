import asyncio
from types import SimpleNamespace

from app.services import ai_analysis


def test_configure_vertex_uses_express_mode_api_key(monkeypatch):
    captured: dict[str, object] = {}
    fake_client = object()

    def create_client(**kwargs):
        captured.update(kwargs)
        return fake_client

    monkeypatch.setattr(ai_analysis, "VERTEX_AVAILABLE", True, raising=False)
    monkeypatch.setattr(
        ai_analysis,
        "genai",
        SimpleNamespace(Client=create_client),
        raising=False,
    )
    monkeypatch.setattr(
        ai_analysis,
        "types",
        SimpleNamespace(GenerateContentConfig=lambda **kwargs: kwargs),
        raising=False,
    )
    monkeypatch.setattr(ai_analysis.settings, "VERTEX_API_KEY", "AQ.test-key", raising=False)
    monkeypatch.setattr(ai_analysis.settings, "VERTEX_MODEL", "gemini-3.5-flash", raising=False)

    model = ai_analysis._configure_vertex()

    assert captured == {"vertexai": True, "api_key": "AQ.test-key"}
    assert model.client is fake_client
    assert model.model_name == "gemini-3.5-flash"
    assert model.generation_config["temperature"] == 0.2


def test_vertex_model_generates_multimodal_content(monkeypatch):
    calls: list[dict[str, object]] = []
    image_part = object()
    expected_response = SimpleNamespace(text='{"category":"dress"}')

    class FakeModels:
        def generate_content(self, **kwargs):
            calls.append(kwargs)
            return expected_response

    class FakePart:
        @staticmethod
        def from_bytes(*, data, mime_type):
            assert data == b"image-bytes"
            assert mime_type == "image/png"
            return image_part

    monkeypatch.setattr(
        ai_analysis,
        "types",
        SimpleNamespace(Part=FakePart),
        raising=False,
    )
    model = ai_analysis._VertexModel(
        client=SimpleNamespace(models=FakeModels()),
        model_name="gemini-3.5-flash",
        generation_config={"temperature": 0.2},
    )

    response = model.generate_content(
        [
            "Görseli analiz et",
            {"mime_type": "image/png", "data": b"image-bytes"},
        ]
    )

    assert response is expected_response
    assert calls == [
        {
            "model": "gemini-3.5-flash",
            "contents": ["Görseli analiz et", image_part],
            "config": {"temperature": 0.2},
        }
    ]


def test_vertex_fallback_reuses_express_mode_client(monkeypatch):
    attempted_models: list[str] = []
    expected_response = SimpleNamespace(text='{"valid":true}')

    class FakeModels:
        def generate_content(self, **kwargs):
            attempted_models.append(kwargs["model"])
            if kwargs["model"] == "gemini-3.5-flash":
                raise RuntimeError("404 model not found")
            return expected_response

    monkeypatch.setattr(ai_analysis, "FALLBACK_MODELS", ["gemini-2.5-flash"])
    primary_model = ai_analysis._VertexModel(
        client=SimpleNamespace(models=FakeModels()),
        model_name="gemini-3.5-flash",
        generation_config={"temperature": 0.2},
    )

    response = ai_analysis._try_generate_with_fallback(
        primary_model,
        ["Ölçüleri doğrula"],
    )

    assert response is expected_response
    assert attempted_models == ["gemini-3.5-flash", "gemini-2.5-flash"]


def test_analysis_reports_vertex_api_restriction_instead_of_missing_key(monkeypatch):
    class BlockedModel:
        def generate_content(self, _content_parts):
            raise RuntimeError(
                "403 PERMISSION_DENIED: API_KEY_SERVICE_BLOCKED "
                "aiplatform.googleapis.com"
            )

    monkeypatch.setattr(ai_analysis, "_configure_vertex", lambda **_kwargs: BlockedModel())

    result = asyncio.run(ai_analysis.analyze_image_bytes(b"image-bytes", "image/jpeg"))

    assert result["demo_mode"] is True
    assert result["error"] == (
        "Vertex AI erişimi Google Cloud API anahtarı kısıtları tarafından engellendi. "
        "Agent Platform (Vertex AI) API'yi etkinleştirip anahtara izin verin."
    )
