# Nội dung file Makefile

dev:
	docker compose up -d --build

deploy:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

down:
	docker compose down