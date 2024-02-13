---
title: "Bert 전처리 수행 절차 소개"
desc: "참고자료 입니다."
category: ["deep learning"]
date: "2022-10-13"
thumbnail: "/assets/blog/deeplearning/paper/Bert/thumbnail.png"
ogImage:
  url: "/assets/blog/deeplearning/paper/Bert/thumbnail.png"
---

## 전처리 절차 소개

- 문장 시작 [CLS] | 문장 끝 [SEP]

- MLM 방식과 NSP 방식을 통해 학습
- MLM의 경우 전체 단어의 15%가 Mask or 엉뚱한 단어로 변경
- 이때 비율은 [Mask] 8, 엉뚱한 단어 2
- NSP의 경우 다음 문장을 예측하는 용도
- NSP를 위해 하나의 row는 2개의 sentence로 구성

## WordPiece Embedding

- Word Piece는 context 기반, word embedding은 단어 기반
- Bank라는 단어는 문맥에 따라 여러 의미로 쓰임.
- ex) We Went to river Bank || I need to go to bank
- Word Piece는 두 개의 vector를 생성한다면 word embbeding은 하나의 vector만 생성함.

  <a href ='https://medium.com/swlh/differences-between-word2vec-and-bert-c08a3326b5d1'> 출처 : WordPiece Embedding과 Word2Vec차이 </a>

- WordPiece Embedding은 SubWord를 사용

  - 단어를 보면 ##ing과 같이 구분되고 있음. 같은단어라도 단어의 조합에 따라 의미가 다르고 이를 반영하기 위한 조치임

  ![img](/assets/blog/deeplearning/paper/Bert/img1.png)

  > 자주 등장하는 단어(sub-word)는 그 자체가 단위가 되고, 자주 등장하지 않는 단어(rare word)는 더 작은 sub-word로 쪼개어집니다.

  <a href = 'https://happy-obok.tistory.com/23'> Bert 이해하기 : WordPiece 소개</a>

  > 단어보다 더 작은 단위로 쪼개는 서브워드 토크나이저(subword tokenizer)를 사용합니다. 서브워드 토크나이저는 기본적으로 자주 등장하는 단어는 그대로 단어 집합에 추가하지만, 자주 등장하지 않는 단어는 더 작은 단위인 서브워드로 분리되어 서브워드들이 단어 집합에 추가된다는 아이디어를 갖고 있습니다.
  >
  > 예를 들어, embeddings라는 단어가 입력으로 들어왔을 때 BERT는 단어 집합에 해당 단어가 존재하지 않았다고 해봅시다. 서브워드 토크나이저가 아닌 토크나이저라면 여기서 OOV(out of vocabulary) 문제가 발생하지만, 서브워드 토크나이저의 경우 해당 단어를 더 쪼개려고 시도합니다. 만약 BERT의 단어 집합에 em, ##bed, ##ding, #s라는 서브워드들이 존재한다면 embeddings는 em, ##bed, ##ding, #s로 분리됩니다. 여기서 ##은 서브워드들이 단어 중간부터 등장하는 것임을 알려주기 위한 기호입니다.

  <a href = 'https://moondol-ai.tistory.com/463#:~:text=BERT%EB%8A%94%20%EB%91%90%20%EA%B0%9C%EC%9D%98%20%EB%AC%B8%EC%9E%A5,%EA%B0%9C%EC%9D%98%20%EB%AC%B8%EC%9E%A5%EC%9D%B4%20%EC%A3%BC%EC%96%B4%EC%A7%91%EB%8B%88%EB%8B%A4.'> BERT의 서브워드 토크나이저: WordPiece</a>

```python
import pandas as pd

IMDB_data = pd.read_csv('./data/IMDB Dataset.csv')

IMDB_data.head()
```

<div>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>review</th>
      <th>sentiment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>One of the other reviewers has mentioned that ...</td>
      <td>positive</td>
    </tr>
    <tr>
      <th>1</th>
      <td>A wonderful little production. &lt;br /&gt;&lt;br /&gt;The...</td>
      <td>positive</td>
    </tr>
    <tr>
      <th>2</th>
      <td>I thought this was a wonderful way to spend ti...</td>
      <td>positive</td>
    </tr>
    <tr>
      <th>3</th>
      <td>Basically there's a family where a little boy ...</td>
      <td>negative</td>
    </tr>
    <tr>
      <th>4</th>
      <td>Petter Mattei's "Love in the Time of Money" is...</td>
      <td>positive</td>
    </tr>
  </tbody>
</table>
</div>

```python
from torch.utils.data import Dataset
from torchtext.data.utils import get_tokenizer
from torchtext.vocab import vocab
from collections import Counter
import torch
import numpy as np
import pandas as pd
import random
from tqdm import tqdm

class IMDBBertData(Dataset) :
    # special token
    CLS = '[CLS]' # 문장 시작
    PAD = '[PAD]' # 빈공간
    SEP = '[SEP]' # 문장 끝
    MASK = '[MASK]'
    UNK = '[UNK]'

    MASKED_INDICES_COLUMN = 'masked_indices'
    TARGET_COLUMN = 'indices'

    # nsp 용도
    NSP_TARGET_COLUMN = 'is_next'
    TOKEN_MASK_COLUMN = 'token_mask'

    mask_percent = 0.15

    OPTIMAL_LENGTH_PERCENTILE = 70


    def __init__(self,path, ds_from=None, ds_to=None, should_include_text=False) -> None:
        '''
         should_include_text = True : Debug 모드
        '''
        # load dataset
        self.ds = pd.read_csv(path)['review']

        # slice dataset
        if ds_from is not None or ds_to is not None :
            self.ds[ds_from:ds_to]

        self.tokenizer = get_tokenizer('basic_english')
        self.counter = Counter()
        self.vocab = None

        self.optimal_sentence_length = None
        self.should_include_text = should_include_text

        # self.df(dataframe) 만들 때 column 정의
        if should_include_text :
            self.columns = [
                'masked_sentence',
                self.MASKED_INDICES_COLUMN,'sentence',
                self.TARGET_COLUMN,
                self.TOKEN_MASK_COLUMN,
                self.NSP_TARGET_COLUMN
                ]

        else :
            self.columns = [
                self.MASKED_INDICES_COLUMN,
                self.TARGET_COLUMN,
                self.TOKEN_MASK_COLUMN,
                self.NSP_TARGET_COLUMN
                ]

        # 최종 값 df에 저장
        self.df = self.prepare_dataset()

    def __len__(self) :
        return len(self.df)

    def __getitem__(self, index):
        '''
        getitem은 class에서 바로 슬라이싱을 하면 실행하는 함수임
        ex) IMDBBertData[0:1] => return (inp,attention_mask ...)
        현재는 getitem을 활용해 trainin을 간편하게 하려는 목적임
        '''

        item = self.df.iloc[index]
        inp = torch.Tensor(item[self.MASKED_INDICES_COLUMN]).long() # int64 타입지정
        token_mask = torch.Tensor(item[self.TOKEN_MASK_COLUMN]).bool()

        mask_target = torch.Tensor(item[self.TARGET_COLUMN]).long() # int64 타입지정
        mask_target = mask_target.masked_fill_(token_mask, 0)


        # 훈련 시 [PAD] 제거용으로 쓰인다고 함.
        attention_mask = (inp==self.vocab[self.PAD]).unsqueeze(0)

        if item[self.NSP_TARGET_COLUMN] == 0 :
            t = [1,0]
        else :
            t = [0,1]
        nsp_target = torch.Tensor(t)
        return(
            inp,attention_mask,token_mask,mask_target,nsp_target
        )

    def prepare_dataset(self) :
        '''
        Main Function
        Bert에 활용 될 Dataset 만드는 function
        '''

        # vocab에 단어 저장
        # vocab 사용법 : vocab(['here','is','the','example']) => to indices
        # vocab.lookup_indices()
        # vocab.lookup_token()

        sentences = []
        nsp = []
        sentence_lens = []

        # For MLM
        for review in self.ds :
            review_sentences = review.split('. ')
            sentences += review_sentences #extend 대신 + 사용해도 됨
            self._update_length(review_sentences,sentence_lens)

        self.optimal_sentence_length = self._find_optimal_sentence_length(sentence_lens)

        print('vocab 생성')
        for sentence in tqdm(sentences) :
            s = self.tokenizer(sentence)
            self.counter.update(s)

        self._fill_vocab()

        # For NSP
        print('데이터 전처리 시작')
        for review in tqdm(self.ds) :
            review_sentences = review.split('. ')
            if len(review_sentences) > 1 :
                for i in range(len(review_sentences) - 1) :
                    # True NSP item
                    first, second = self.tokenizer(review_sentences[i]),self.tokenizer(review_sentences[i + 1])
                    nsp.append(self._create_item(first,second,1))
                    # False NSP item
                    first,second = self._select_false_nsp_sentences(sentences)
                    first,second = self.tokenizer(first), self.tokenizer(second)
                    nsp.append(self._create_item(first,second,0))

        df = pd.DataFrame(nsp,columns=self.columns)
        return df



    # For MLM
    def _update_length(self,input:list, output) :
        '''
        개별 문장의 단어 개수 반환
        '''
        for sen in input :
            output.append(len(sen.split(' ')))



    def _find_optimal_sentence_length(self,lengths:list) :
        '''
        lengths = dataset에 있는 문장 길이
        return : 70% 범위의 문장 길이
        IMDB는 27개라고 함.
        '''
        arr = np.array(lengths)
        return int(np.percentile(arr,self.OPTIMAL_LENGTH_PERCENTILE))

    def _fill_vocab(self) :
        # 2번 이상 반복되는 단어만 저장하기
        self.vocab = vocab(self.counter, min_freq=2)

        self.vocab.insert_token(self.CLS, 0)
        self.vocab.insert_token(self.PAD, 1)
        self.vocab.insert_token(self.MASK, 2)
        self.vocab.insert_token(self.SEP, 3)
        self.vocab.insert_token(self.UNK, 4)
        self.vocab.set_default_index(4)

    def _create_item(self,first:list, second:list, target:int = 1):
        '''
        NSP 훈련용으로 활용
        1. Masked Sentence 생성
        2. random words Sentence 생성
        '''

        # 1.masked Sentence 생성
        updated_first, first_mask = self._preprocess_sentence(first.copy())
        updated_second, second_mask = self._preprocess_sentence(second.copy())

        nsp_sentence = updated_first + [self.SEP] + updated_second
        nsp_indicies = self.vocab.lookup_indices(nsp_sentence)
        inverse_token_mask = first_mask + [True] + second_mask

        # 2.masked Sentence 생성
        first,_ =self._preprocess_sentence(first.copy(), should_mask = False)
        second,_ =self._preprocess_sentence(second.copy(), should_mask = False)
        original_nsp_sentence = first + [self.SEP] + second
        original_nsp_indices = self.vocab.lookup_indices(original_nsp_sentence)

        if self.should_include_text :
            return(
                nsp_sentence,
                nsp_indicies,
                original_nsp_sentence,
                original_nsp_indices,
                inverse_token_mask,
                target
            )
        else :
            return (
                nsp_indicies,
                original_nsp_indices,
                inverse_token_mask,
                target
            )

    # For NSP Sentence
    def _select_false_nsp_sentences(self, sentences:list) :
        '''
        false NSP 만들 sentence 선택하기
        sentences : 문장 리스트 전체
        return : 임의로 문장 2개 선택(앞과 뒤는 연결되지 않음)
        '''
        sentences_len = len(sentences)
        sentence_index = random.randint(0,sentences_len -1)
        next_sentence_index = random.randint(0,sentences_len -1)

        while next_sentence_index == sentence_index +1 :
            next_sentence_index = random.randint(0,sentences_len -1)

        return sentences[sentence_index], sentences[next_sentence_index]

    def _preprocess_sentence(self, sentence:list, should_mask :bool = True) :
        '''
        mask 퍼센트(15%)를 [mask]로 바꾸는 매소드
        sentences : 문장 리스트 전체
        return : mask 된 문장, inverse token mask
        '''
        inverse_token_mask = None
        if should_mask :
            sentence, inverse_token_mask = self._mask_sentence(sentence)
        sentence, inverse_token_mask = self._pad_sentence([self.CLS] + sentence,inverse_token_mask)

        return sentence, inverse_token_mask

    def _mask_sentence(self,sentence:list) :
        '''
        mask 퍼센트(15%)를 [mask] 또는 랜덤한 단어로 바뀜
        이때 [mask] : random_word = 8 : 2 비율
        sentence : 문장 하나
        return : mask 또는 random 단어 변환 된 문장, inverse token mask
        '''
        len_s = len(sentence)
        # len(len_s, 27)
        # masked 된 문장 또는 단어가 바뀐 경우 False로 변환됨
        inverse_token_mask = [True for _ in range(max(len_s,self.optimal_sentence_length))]

        mask_amount = round(len_s *self.mask_percent)

        for _ in range(mask_amount) :
            i = random.randint(0,len_s - 1)

            if random.random() < 0.8 :
                # mask_amount의 80%는 mask로
                sentence[i] = self.MASK
            else :
                # # mask_amount의 20%는 단어 바꾸기
                # 5인 이유는 0,1,2,3,4 토큰이 모두 special token이기 때문
                j = random.randint(5,len(self.vocab) - 1)

                # 단어 바꾸기
                sentence[i] = self.vocab.lookup_token(j)

            inverse_token_mask[i] = False

        return sentence, inverse_token_mask

    def _pad_sentence(self,sentence : list,inverse_token_mask : bool) :
        len_s =len(sentence)

        # self.optimal_sentence_length = 27단어
        if len_s >= self.optimal_sentence_length :
            s = sentence[:self.optimal_sentence_length]
        else :
            s = sentence + [self.PAD] * (self.optimal_sentence_length - len_s)

        if inverse_token_mask :
            len_m = len(inverse_token_mask)
            if len_m >= self.optimal_sentence_length :
                inverse_token_mask = inverse_token_mask[:self.optimal_sentence_length]
            else :
                inverse_token_mask = inverse_token_mask + [True] * (self.optimal_sentence_length - len_m)

        return s, inverse_token_mask








a = IMDBBertData('./data/IMDB Dataset.csv',should_include_text=True)

a.vocab(['here','is','the','example'])


```
    vocab 생성

    100%|██████████| 491161/491161 [00:05<00:00, 93639.04it/s]

    데이터 전처리 시작
    100%|██████████| 50000/50000 [01:23<00:00, 597.85it/s]

    [646, 30, 7, 2484]

```python
end = a.df
len(end)
```

    882322

```python
end.head()
```

<div>
<table border="1" class="dataframe">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>masked_sentence</th>
      <th>masked_indices</th>
      <th>sentence</th>
      <th>indices</th>
      <th>token_mask</th>
      <th>is_next</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>[[CLS], one, of, the, [MASK], reviewers, has, ...</td>
      <td>[0, 5, 6, 7, 2, 9, 10, 11, 12, 13, 14, 15, 2, ...</td>
      <td>[[CLS], one, of, the, other, reviewers, has, m...</td>
      <td>[0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,...</td>
      <td>[True, True, True, False, True, True, True, Tr...</td>
      <td>1</td>
    </tr>
    <tr>
      <th>1</th>
      <td>[[CLS], it, ', s, a, really, great, movie, [MA...</td>
      <td>[0, 73, 20, 242, 56, 246, 240, 364, 2, 41322, ...</td>
      <td>[[CLS], it, ', s, a, really, great, movie, wit...</td>
      <td>[0, 73, 20, 242, 56, 246, 240, 364, 34, 56, 19...</td>
      <td>[True, True, True, True, True, True, True, Fal...</td>
      <td>0</td>
    </tr>
    <tr>
      <th>2</th>
      <td>[[CLS], they, are, right, ,, [MASK], this, [MA...</td>
      <td>[0, 24, 25, 26, 27, 2, 29, 2, 31, 32, 33, 34, ...</td>
      <td>[[CLS], they, are, right, ,, as, this, is, exa...</td>
      <td>[0, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34...</td>
      <td>[True, True, True, True, False, True, False, T...</td>
      <td>1</td>
    </tr>
    <tr>
      <th>3</th>
      <td>[[CLS], and, also, to, see, how, an, [MASK], b...</td>
      <td>[0, 44, 624, 67, 226, 450, 87, 2, 153, 2, 4117...</td>
      <td>[[CLS], and, also, to, see, how, an, good, but...</td>
      <td>[0, 44, 624, 67, 226, 450, 87, 469, 153, 3618,...</td>
      <td>[True, True, True, True, True, True, False, Tr...</td>
      <td>0</td>
    </tr>
    <tr>
      <th>4</th>
      <td>[[CLS], trust, me, ,, this, is, not, a, [MASK]...</td>
      <td>[0, 54, 35, 27, 29, 30, 55, 56, 2, 58, 7, 59, ...</td>
      <td>[[CLS], trust, me, ,, this, is, not, a, show, ...</td>
      <td>[0, 54, 35, 27, 29, 30, 55, 56, 57, 58, 7, 59,...</td>
      <td>[True, True, True, True, True, True, True, Fal...</td>
      <td>1</td>
    </tr>
  </tbody>
</table>
</div>

```python
# 문장이 2개 있는 이유 NSP 구분하기 위함
end.iloc[0][0]

```

    ['[CLS]',
     'one',
     'of',
     'the',
     '[MASK]',
     'reviewers',
     'has',
     'mentioned',
     'that',
     'after',
     'watching',
     'just',
     '[MASK]',
     'oz',
     'reinvent',
     'you',
     "'",
     'll',
     'be',
     'hooked',
     '[PAD]',
     '[PAD]',
     '[PAD]',
     '[PAD]',
     '[PAD]',
     '[PAD]',
     '[PAD]',
     '[SEP]',
     '[CLS]',
     '[MASK]',
     'are',
     'right',
     ',',
     'as',
     'this',
     'is',
     'exactly',
     'what',
     'happened',
     'with',
     'me',
     '.',
     'the',
     '[MASK]',
     'thing',
     'that',
     'struck',
     'me',
     'about',
     'oz',
     'ladylike',
     'its',
     'dotty',
     'and',
     'unflinching']

```python
end.to_csv('./data/preprocessed_DB.csv',index=0)
```
