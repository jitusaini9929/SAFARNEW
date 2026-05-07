import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx"]);
const SYLLABUS_AGENT_BASE_URL = (
  process.env.SYLLABUS_AGENT_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

router.use(requireAuth);

router.post(
  "/import",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }
      const filename = file.originalname || "";
      const extension = filename.includes(".")
        ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
        : "";
      const mimeType = (file.mimetype || "").toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({
          success: false,
          message: "Only PDF and DOCX files are supported.",
        });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
        });
      }

      const formData = new FormData();
      formData.append(
        "file",
        new Blob([new Uint8Array(file.buffer)], {
          type: file.mimetype || "application/octet-stream",
        }),
        file.originalname,
      );

      const agentResponse = await fetch(
        `${SYLLABUS_AGENT_BASE_URL}/api/syllabus/import`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await agentResponse.json().catch(() => null);
      if (!agentResponse.ok) {
        const detailMessage =
          payload?.detail || payload?.message || payload?.error || "Syllabus import failed";
        return res.status(agentResponse.status).json(
          payload?.success !== undefined
            ? payload
            : {
                success: false,
                message: detailMessage,
              },
        );
      }

      return res.json(
        payload?.success !== undefined
          ? payload
          : {
              success: false,
              message: "Invalid response from syllabus agent.",
            },
      );
    } catch (error: any) {
      console.error("[SYLLABUS-IMPORT] Failed to process upload:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Syllabus import failed",
      });
    }
  },
);

export const syllabusImportRoutes = router;
