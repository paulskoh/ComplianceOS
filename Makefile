.PHONY: help install dev build test clean db-migrate db-seed db-studio docker-up docker-down

help:
	@echo "ComplianceOS - Available Commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start development servers"
	@echo "  make build        - Build all apps"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make docker-up    - Start Docker services"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-seed      - Seed database with sample data"
	@echo "  make db-studio    - Open Prisma Studio"

install:
	npm install

dev: docker-up
	npm run dev

build:
	npm run build

test:
	npm run test

clean:
	npm run clean

docker-up:
	docker-compose -f infra/docker-compose.yml up -d

docker-down:
	docker-compose -f infra/docker-compose.yml down

db-migrate:
	npm run db:migrate

db-seed:
	npm run db:seed

db-studio:
	npm run db:studio
