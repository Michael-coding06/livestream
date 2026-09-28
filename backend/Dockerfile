# ==========================================
# STAGE 1: Môi trường biên dịch (Builder)
# ==========================================
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Tận dụng Docker layer cache cho dependencies
COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Biên dịch 2 file binary riêng biệt (-w -s cắt bỏ debug symbols)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/producer ./cmd/producer
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/consumer ./cmd/consumer

# ==========================================
# STAGE 2: Môi trường thực thi siêu nhẹ (Runner)
# ==========================================
FROM alpine:latest AS prod

WORKDIR /app

# 1. Cài certificates (HTTPS) và tzdata (múi giờ) TRƯỚC để tối ưu cache
RUN apk --no-cache add ca-certificates tzdata

# 2. Copy binary từ stage builder sang
COPY --from=builder /app/bin/producer /app/producer
COPY --from=builder /app/bin/consumer /app/consumer