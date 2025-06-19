FROM node:16-alpine as build

WORKDIR /app

COPY package.json /app/

RUN yarn install

COPY . /app/

RUN npm run build

FROM node:16-alpine as deploy

COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist

CMD [ "node", "dist/main.js" ]