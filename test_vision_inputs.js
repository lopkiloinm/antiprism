import * as ort from "onnxruntime-node";

async function main() {
  const session = await ort.InferenceSession.create("onnx/embed_images_fp16.onnx");
  const pv = new ort.Tensor("float32", new Float32Array(2 * 1024 * 768), [2, 1024, 768]);
  const pam = new ort.Tensor("int64", new BigInt64Array(2 * 1024).fill(1n), [2, 1024]);
  const ss = new ort.Tensor("int64", new BigInt64Array([32n, 32n, 16n, 16n]), [2, 2]);

  try {
    await session.run({ pixel_values: pv, pixel_attention_mask: pam, spatial_shapes: ss });
    console.log("Success with 3D (2, 1024, 768) and ss [2, 2]");
  } catch (e) {
    console.error("Failed:", e.message);
  }
}

main().catch(console.error);
